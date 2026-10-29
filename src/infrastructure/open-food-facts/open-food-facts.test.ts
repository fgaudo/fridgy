import { describe, expect, test } from 'bun:test'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import * as Headers from 'effect/http/Headers'
import * as HttpClient from 'effect/http/HttpClient'
import type * as HttpClientRequest from 'effect/http/HttpClientRequest'
import * as HttpClientResponse from 'effect/http/HttpClientResponse'
import * as UrlParams from 'effect/http/UrlParams'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as References from 'effect/References'
import * as TestClock from 'effect/testing/TestClock'
import * as fc from 'fast-check'
import { version } from '#package.json'
import { normalizeCode, OpenFoodFacts, type OpenFoodFactsError, TIMEOUT } from './open-food-facts.ts'

// The bodies the server answered on 2026-10-27, cut to the fields asked: an unknown product's with a 404.
const found = {
  code: '8076800195057',
  product: {
    brands: 'Barilla, Barilla Group',
    product_name: 'Spaghetti Nº5',
    product_name_it: 'Spaghetti n.5',
    quantity: '500 g',
    lang: 'en',
  },
  status: 1,
  status_verbose: 'product found',
}

const notFound = { code: '20267422', status: 0, status_verbose: 'product not found' }

type Answer = Readonly<{ body: string; status: number; contentType?: string }>

const json = (body: unknown, status = 200): Answer => ({ body: JSON.stringify(body), status })

/** A client answering every request with `answer`, keeping the requests it was sent. */
const fakeClient = (answer: Effect.Effect<Answer>) => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = []
  const client = HttpClient.make((request) => {
    requests.push(request)
    return Effect.map(
      answer,
      ({ body, status, contentType = 'application/json' }) =>
        HttpClientResponse.fromWeb(request, new Response(body, { status, headers: { 'content-type': contentType } })),
    )
  })
  return { requests, layer: OpenFoodFacts.layer.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, client))) }
}

const fetchWith = (answer: Effect.Effect<Answer>, code = '8076800195057', language = 'it') => {
  const { requests, layer } = fakeClient(answer)
  return Effect.runPromise(
    OpenFoodFacts.use(({ fetchProduct }) => fetchProduct(code, language)).pipe(
      Effect.exit,
      Effect.provide(layer),
      Effect.provideService(References.MinimumLogLevel, 'Warn'),
    ),
    // Compared with plain values: the brands of the names are the type's only.
  ).then((exit): { exit: Exit.Exit<Opt.Option<unknown>, OpenFoodFactsError>; requests: typeof requests } => ({
    exit,
    requests,
  }))
}

const digits = fc.string({ unit: fc.constantFrom(...'0123456789'), minLength: 1, maxLength: 20 })

describe('normalizeCode', () => {
  test('is idempotent, and answers only digits, 8 or at least 13 of them', () => {
    fc.assert(fc.property(digits, (raw) => {
      const code = Opt.getOrThrow(normalizeCode(raw))
      return /^\d+$/.test(code) && (code.length === 8 || code.length >= 13)
        && Opt.contains(normalizeCode(code), code)
    }))
  })

  test('answers None for anything with a non-digit', () => {
    fc.assert(fc.property(fc.string(), (raw) => {
      fc.pre(!/^\d+$/.test(raw))
      return Opt.isNone(normalizeCode(raw))
    }))
  })

  test('pads as the server does', () => {
    expect(normalizeCode('049000006346')).toEqual(normalizeCode('0049000006346'))
    expect(normalizeCode('049000006346')).toEqual(Opt.some('0049000006346'))
    expect(normalizeCode('20267422')).toEqual(Opt.some('20267422'))
    expect(normalizeCode('12345')).toEqual(Opt.some('00012345'))
    expect(normalizeCode('00012345')).toEqual(Opt.some('00012345'))
  })
})

describe('OpenFoodFacts.fetchProduct', () => {
  test('answers a found product in the language asked, with its brands and its quantity', async () => {
    const { exit } = await fetchWith(Effect.succeed(json(found)))
    expect(exit).toEqual(Exit.succeed(Opt.some({
      name: 'Spaghetti n.5',
      brands: ['Barilla', 'Barilla Group'],
      maybeQuantity: Opt.some('500 g'),
    })))
  })

  test('answers the main name when the product has none in the language asked, or a blank one', async () => {
    for (
      const product of [{ ...found.product, product_name_it: undefined }, { ...found.product, product_name_it: ' ' }]
    ) {
      const { exit } = await fetchWith(Effect.succeed(json({ ...found, product })))
      expect(exit).toEqual(Exit.succeed(Opt.some({
        name: 'Spaghetti Nº5',
        brands: ['Barilla', 'Barilla Group'],
        maybeQuantity: Opt.some('500 g'),
      })))
    }
  })

  test('answers a product without brands or quantity, blank ones included', async () => {
    const { exit } = await fetchWith(
      Effect.succeed(json({ ...found, product: { product_name: 'Milk', brands: ' , ', quantity: '' } })),
    )
    expect(exit).toEqual(Exit.succeed(Opt.some({ name: 'Milk', brands: [], maybeQuantity: Opt.none() })))
  })

  test('answers None for a product without a name, missing or blank', async () => {
    for (const product_name of [undefined, '', '  ']) {
      const { exit } = await fetchWith(
        Effect.succeed(json({ ...found, product: { brands: 'Barilla', product_name } })),
      )
      expect(exit).toEqual(Exit.succeed(Opt.none()))
    }
  })

  test('answers None for a product the server does not know', async () => {
    const { exit } = await fetchWith(Effect.succeed(json(notFound, 404)), '20267422')
    expect(exit).toEqual(Exit.succeed(Opt.none()))
  })

  test('fails on a status other than 2xx, and on a body that is not the API\'s', async () => {
    const answers: ReadonlyArray<Answer> = [
      json({ status: 503 }, 503),
      { body: '<html>Not found</html>', status: 404, contentType: 'text/html' },
      { body: '<html>Bad gateway</html>', status: 200, contentType: 'text/html' },
      json({ product: {} }),
      json({ ...found, product: { ...found.product, brands: ['Barilla'] } }),
    ]
    for (const answer of answers) {
      const { exit } = await fetchWith(Effect.succeed(answer))
      expect(Exit.isFailure(exit)).toBe(true)
      expect(Exit.findErrorOption(exit).pipe(Opt.map((error) => error._tag))).toEqual(Opt.some('OpenFoodFactsError'))
    }
  })

  test(`fails once the server has not answered for ${TIMEOUT}`, async () => {
    const { layer } = fakeClient(Effect.never)
    const exit = await Effect.runPromise(
      Effect.gen(function*() {
        const { fetchProduct } = yield* OpenFoodFacts
        const fiber = yield* Effect.forkChild(fetchProduct('8076800195057', 'it'))
        yield* TestClock.adjust('4 seconds')
        expect(fiber.pollUnsafe()).toBeUndefined()
        yield* TestClock.adjust('1 second')
        return yield* Fiber.await(fiber)
      }).pipe(
        Effect.provide(Layer.merge(layer, TestClock.layer())),
        Effect.provideService(References.MinimumLogLevel, 'Warn'),
      ),
    )
    expect(Exit.findErrorOption(exit).pipe(Opt.map((error) => error._tag))).toEqual(Opt.some('OpenFoodFactsError'))
  })

  test('asks for the product\'s code with the fields it needs, as the app it is, without tracing headers', async () => {
    const { requests } = await fetchWith(Effect.succeed(json(found)), '8076800195057', 'it')
    expect(requests.length).toBe(1)
    const [request] = requests
    if (request === undefined) return
    expect(request.method).toBe('GET')
    expect(request.url).toBe('https://world.openfoodfacts.org/api/v2/product/8076800195057')
    expect(UrlParams.toRecord(request.urlParams)).toEqual({
      fields: 'product_name,product_name_it,brands,quantity',
      app_name: 'fridgy',
      app_version: version,
    })
    expect(Headers.get(request.headers, 'user-agent')).toEqual(Opt.some(`Fridgy/${version} (fgaudo+fridgy@gmail.com)`))
    expect(Headers.has(request.headers, 'b3')).toBe(false)
    expect(Headers.has(request.headers, 'traceparent')).toBe(false)
  })

  test('asks in English for a language that is not one', async () => {
    const { requests } = await fetchWith(Effect.succeed(json(found)), '8076800195057', 'it-IT')
    expect(requests.map(({ urlParams }) => UrlParams.getFirst(urlParams, 'fields'))).toEqual([
      Opt.some('product_name,product_name_en,brands,quantity'),
    ])
  })

  test('links the product\'s page', async () => {
    const { layer } = fakeClient(Effect.never)
    const url = await Effect.runPromise(
      OpenFoodFacts.use(({ productUrl }) => Effect.succeed(productUrl('8076800195057'))).pipe(Effect.provide(layer)),
    )
    expect(url).toBe('https://world.openfoodfacts.org/product/8076800195057')
  })
})
