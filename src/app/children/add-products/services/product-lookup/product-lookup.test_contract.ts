// What every adapter of `ProductLookup` must do. It holds no implementation: each adapter's
// `<service>.<backing>.test.ts` runs it with its own layer, on a server the contract scripts and counts the
// requests of, and with its storage's own reads and writes of the cache, which reach it without a service.
import { describe, test } from 'bun:test'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Exit from 'effect/Exit'
import type * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Ref from 'effect/Ref'
import * as References from 'effect/References'
import * as TestClock from 'effect/testing/TestClock'
import * as fc from 'fast-check'
import { ProductLookup } from './product-lookup.ts'

/** What the server answers for a code. */
export type Answer =
  | Readonly<{ _tag: 'Known'; name: string; brands: ReadonlyArray<string>; maybeQuantity: Opt.Option<string> }>
  | Readonly<{ _tag: 'Unknown' }>
  | Readonly<{ _tag: 'Unreachable' }>

/** A server answering the contract's script: the adapter reaches Open Food Facts through it. */
export type Server = Readonly<{
  /** The answer for `code`; counted as a request. */
  answer: (code: string) => Effect.Effect<Answer>
  /** The product's page. */
  productUrl: (code: string) => string
}>

/** The adapter's cache, reached without a service. */
export type Storage<R> = Readonly<{
  /** Whether an answer is cached for `barcode`. */
  isCached: (barcode: string) => Effect.Effect<boolean, never, R>
  /** Caches, as an earlier version might have, a found product with a blank name. */
  cacheBlankName: (barcode: string) => Effect.Effect<void, never, R>
}>

const digits = (length: number) =>
  fc.string({ unit: fc.constantFrom(...'0123456789'), minLength: length, maxLength: length })

/** The codes a scanner reads: EAN-8, UPC-A and EAN-13. */
const barcode = fc.oneof(digits(8), digits(12), digits(13))

/** A text as Open Food Facts' client gives it: never blank, single-spaced, trimmed. */
const text = fc.array(fc.stringMatching(/^[A-Za-z0-9]{1,6}$/), { minLength: 1, maxLength: 3 }).map((words) =>
  words.join(' ')
)

const known = fc.record({
  _tag: fc.constant('Known' as const),
  name: text,
  brands: fc.array(text, { maxLength: 3 }),
  maybeQuantity: fc.option(text).map(Opt.fromNullishOr),
})

const productUrl = (code: string) => `https://example.org/product/${code}`

/** A server answering `script`'s answer, which the property may change, and the number of requests it heard. */
const scripted = Effect.fnUntraced(function*(first: Answer) {
  const script = yield* Ref.make(first)
  const requests = yield* Ref.make(0)
  const server: Server = {
    answer: () => Effect.andThen(Ref.update(requests, (n) => n + 1), Ref.get(script)),
    productUrl,
  }
  return { server, script, requests: Ref.get(requests) }
})

export const productLookupContract = <R>(
  name: string,
  adapter: (server: Server) => Layer.Layer<ProductLookup | R>,
  { isCached, cacheBlankName }: Storage<R>,
) =>
  describe(`ProductLookup contract (${name})`, () => {
    /**
     * Runs `property` on a fresh layer over a fresh server, which answers `first` until the property changes it,
     * under a test clock.
     */
    const check = <A>(
      arbitrary: fc.Arbitrary<readonly [A, Answer]>,
      property: (
        a: A,
        server: Readonly<{ script: Ref.Ref<Answer>; requests: Effect.Effect<number> }>,
      ) => Effect.Effect<boolean, never, ProductLookup | R>,
    ) =>
      fc.assert(
        fc.asyncProperty(arbitrary, ([a, first]) =>
          Effect.runPromise(
            Effect.gen(function*() {
              const { server, script, requests } = yield* scripted(first)
              return yield* property(a, { script, requests }).pipe(
                Effect.provide(TestClock.layer()),
                Effect.provide(adapter(server)),
              )
            }).pipe(
              Effect.timeout('5 seconds'),
              Effect.orDie,
              // Every run builds its storage, which logs that it is ready: only warnings are worth showing.
              Effect.provideService(References.MinimumLogLevel, 'Error'),
            ),
          )),
        { numRuns: 25 },
      )

    const lookup = (barcode: string) => ProductLookup.use(({ lookup }) => lookup(barcode))

    test('a found product answers its name, its first brand, its quantity and its page', () =>
      check(fc.tuple(barcode, known), (code, server) =>
        Effect.gen(function*() {
          const answer = yield* Ref.get(server.script)
          if (answer._tag !== 'Known') return false
          const found = yield* Effect.orDie(lookup(code))
          return Opt.isSome(found)
            && found.value.name === answer.name
            && Equal.equals(found.value.maybeBrand, Opt.fromNullishOr(answer.brands[0]))
            && Equal.equals(found.value.maybeQuantity, answer.maybeQuantity)
            && found.value.url.startsWith(productUrl(''))
        })))

    test('a found product is asked for once, under its code and under any code that is the same to the server, at any time', () =>
      check(
        fc.tuple(fc.tuple(barcode, fc.integer({ min: 0, max: 3650 })), known),
        ([code, days], server) =>
          Effect.gen(function*() {
            const first = yield* Effect.orDie(lookup(code))
            yield* TestClock.adjust({ days })
            const again = yield* Effect.orDie(lookup(code))
            const padded = yield* Effect.orDie(lookup(`0${code}`))
            return Opt.isSome(first)
              && Opt.isSome(again) && again.value.name === first.value.name
              && Opt.isSome(padded) && padded.value.name === first.value.name
              && (yield* server.requests) === 1
          }),
      ))

    test('a product unknown to Open Food Facts is not asked for again for a week, and is then', () =>
      check(fc.tuple(barcode, fc.constant<Answer>({ _tag: 'Unknown' })), (code, server) =>
        Effect.gen(function*() {
          const first = yield* Effect.orDie(lookup(code))
          yield* TestClock.adjust({ days: 6 })
          const again = yield* Effect.orDie(lookup(code))
          const beforeAWeek = yield* server.requests
          yield* TestClock.adjust({ days: 2 })
          yield* Effect.orDie(lookup(code))
          return Opt.isNone(first) && Opt.isNone(again) && beforeAWeek === 1 && (yield* server.requests) === 2
        })))

    test('a product unknown, then added to Open Food Facts, is found once a week has passed', () =>
      check(fc.tuple(fc.tuple(barcode, known), fc.constant<Answer>({ _tag: 'Unknown' })), ([code, later], server) =>
        Effect.gen(function*() {
          yield* Effect.orDie(lookup(code))
          yield* Ref.set(server.script, later)
          yield* TestClock.adjust({ days: 8 })
          const found = yield* Effect.orDie(lookup(code))
          return Opt.isSome(found) && found.value.name === later.name
        })))

    test('a failed request fails, caches nothing, and the next lookup asks again', () =>
      check(fc.tuple(fc.tuple(barcode, known), fc.constant<Answer>({ _tag: 'Unreachable' })), ([code, later], server) =>
        Effect.gen(function*() {
          const failed = yield* Effect.exit(lookup(code))
          const cached = yield* isCached(code)
          yield* Ref.set(server.script, later)
          const found = yield* Effect.orDie(lookup(code))
          return Exit.isFailure(failed)
            && Opt.contains(
              Exit.findErrorOption(failed).pipe(Opt.map(({ _tag }) =>
                _tag
              )),
              'ProductLookupError',
            )
            && !cached && Opt.isSome(found) && (yield* server.requests) === 2
        })))

    test('a barcode that is not digits only answers None, asking nothing and caching nothing', () =>
      check(
        fc.tuple(
          fc.string().filter((code) =>
            !/^\d+$/.test(code)
          ),
          known,
        ),
        (code, server) =>
          Effect.gen(function*() {
            const answer = yield* Effect.orDie(lookup(code))
            return Opt.isNone(answer) && (yield* server.requests) === 0 && !(yield* isCached(code))
          }),
      ))

    test('a cached product with a blank name is asked for again', () =>
      check(fc.tuple(barcode, known), (code, server) =>
        Effect.gen(function*() {
          yield* cacheBlankName(code)
          const found = yield* Effect.orDie(lookup(code))
          return Opt.isSome(found) && (yield* server.requests) === 1
        })))
  })
