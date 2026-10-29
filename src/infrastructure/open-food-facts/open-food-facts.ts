// Open Food Facts' API of products (`/api/v2/product/<code>`), as it answers: the only module that knows its
// shape. Every key of a product may be missing or blank (products are crowd-sourced), and a product unknown to
// the server answers 404 with the API's body, `status` 0.
import * as Arr from 'effect/Array'
import * as Config from 'effect/Config'
import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HttpClient from 'effect/http/HttpClient'
import * as HttpClientRequest from 'effect/http/HttpClientRequest'
import * as HttpClientResponse from 'effect/http/HttpClientResponse'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as NormalizedString from '#libs/strings/normalized-string.ts'
import { version } from '#package.json'

const USER_AGENT = `Fridgy/${version} (fgaudo+fridgy@gmail.com)`

export class OpenFoodFactsError extends Data.TaggedError('OpenFoodFactsError')<{
  readonly cause: unknown
}> {}

/** What the server knows of a product: `name` never blank, the brands and the quantity without blank ones. */
export type Product = Readonly<{
  name: NormalizedString.NormalizedString
  /** In the server's order, the main one first. */
  brands: ReadonlyArray<NormalizedString.NormalizedString>
  /** As written on the package (`400 g e`, `355g`). */
  maybeQuantity: Opt.Option<NormalizedString.NormalizedString>
}>

/**
 * A code as the server stores it: digits only, padded with leading zeros as the server pads them (to 8 digits up
 * to 7, to 13 from 9 to 12); `None` for anything that is not digits only, which the server would answer with no
 * product. The zeros are stripped first, so that `00012345` and `12345` are one code, as they are to the server.
 */
export const normalizeCode = (raw: string): Opt.Option<string> => {
  if (!/^\d+$/.test(raw)) return Opt.none()
  const digits = raw.replace(/^0+(?=\d)/, '')
  if (digits.length <= 7) return Opt.some(digits.padStart(8, '0'))
  if (digits.length >= 9 && digits.length <= 12) return Opt.some(digits.padStart(13, '0'))
  return Opt.some(digits)
}

// Decided without measurement: on a slow mobile network, the most a lookup makes the user wait.
export const TIMEOUT = '5 seconds'

const Answer = Schema.Struct({
  // 1 found, 0 not found.
  status: Schema.Finite,
  // Its keys depend on the language asked: picked by hand, then decoded as `Fields`.
  product: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
})

const Fields = Schema.Struct({
  localName: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  brands: Schema.optional(Schema.String),
  quantity: Schema.optional(Schema.String),
})

const decodeFields = Schema.decodeUnknownEffect(Fields)

/** The first subtag of a language tag of 2 or 3 letters: it goes into the URL, so anything else is English. */
const languageOf = (language: string) => /^[a-z]{2,3}$/.test(language) ? language : 'en'

const nonBlank = (maybe: string | undefined) => Opt.flatMap(Opt.fromNullishOr(maybe), NormalizedString.fromString)

const productOf = (fields: typeof Fields.Type): Opt.Option<Product> =>
  Opt.map(
    Opt.orElse(nonBlank(fields.localName), () => nonBlank(fields.name)),
    (name) => ({
      name,
      brands: Arr.getSomes((fields.brands ?? '').split(',').map(NormalizedString.fromString)),
      maybeQuantity: nonBlank(fields.quantity),
    }),
  )

export class OpenFoodFacts extends Context.Service<OpenFoodFacts>()(
  '9fd2c82dd9ee1f03',
  {
    make: Effect.gen(function*() {
      const baseUrl = yield* Config.String('baseUrl').pipe(
        Config.nested('openFoodFacts'),
        Config.withDefault('https://world.openfoodfacts.org'),
      )
      // A product unknown to the server answers 404, with the API's body (`status` 0): it is an answer too.
      const client = HttpClient.filterStatus(
        yield* HttpClient.HttpClient,
        (status) => (status >= 200 && status < 300) || status === 404,
      )
      /**
       * The product under a normalized `code`, named in `language` when the server has that name, else in the
       * product's main one: `None` when the server does not know it, or knows it without a name. Fails without an
       * answer: no network, a timeout, a status other than 2xx, a body that is not the API's.
       */
      const fetchProduct = Effect.fn('OpenFoodFacts.fetchProduct')(
        function*(code: string, language: string) {
          const lang = languageOf(language)
          yield* Effect.logDebug('Looking up a product', code)
          const request = HttpClientRequest.get(`${baseUrl}/api/v2/product/${code}`).pipe(
            // How the API asks every app to identify itself: its name, its version and a contact, in the
            // `User-Agent` and in the query.
            HttpClientRequest.setHeader('User-Agent', USER_AGENT),
            // `fields` keeps the answer under a kilobyte.
            HttpClientRequest.setUrlParams({
              fields: `product_name,product_name_${lang},brands,quantity`,
              app_name: 'fridgy',
              app_version: version,
            }),
          )
          const answer = yield* client.execute(request).pipe(
            Effect.flatMap(HttpClientResponse.schemaBodyJson(Answer)),
            // A trace's headers (`b3`, `traceparent`) would tell the server what it does not need.
            Effect.provideService(HttpClient.TracerPropagationEnabled, false),
            Effect.timeout(TIMEOUT),
          )
          const { status, product = {} } = answer
          const { [`product_name_${lang}`]: localName, product_name: name, brands, quantity } = product
          const maybeProduct = status === 1 && answer.product !== undefined
            ? productOf(yield* decodeFields({ localName, name, brands, quantity }))
            : Opt.none()
          yield* Effect.logInfo(Opt.isSome(maybeProduct) ? 'Found a product' : 'Found no product', code)
          return maybeProduct
        },
        Effect.mapError((cause) => new OpenFoodFactsError({ cause })),
      )
      /** The product's page on the site, for the attribution the licence asks for. */
      const productUrl = (code: string) => `${baseUrl}/product/${code}`
      return { fetchProduct, productUrl }
    }).pipe(Effect.catchTag('ConfigError', Effect.die)),
  },
) {
  static layer = Layer.effect(this, this.make)
}
