# Design: naming a scanned product from Open Food Facts

Status: designed on 2026-10-27, implemented on 2026-10-27 but not yet tried on Android (step 7 of "Order of
work", and "Known gaps" in `AGENTS.md`). Where the implementation departs from this design, and why, is in
"As implemented" at the end. This document was the brief for whoever implemented it, person or agent: read [`AGENTS.md`](../AGENTS.md), the `add-service` and `add-program` skills and the "Guide" of
`node_modules/@fgaudo/effect-tea/README.md` first; their rules apply to every part of this change and are not
repeated here. Every fact about the Open Food Facts API below was checked against the live server on
2026-10-27 with `curl`; re-check what the code relies on (marked **verified**) before trusting it, the API may
have moved.

Decisions already taken by the owner:

- Effect's `effect/http` module (`HttpClient`, `FetchHttpClient`), marked `@stability unstable` in Effect
  4.0.6, may be used: the app already depends on unstable modules.
- The cache table goes into the existing first migration (`0000001_create_db`), not a new one: no published
  build runs the current schema. If that changes before this lands, it becomes a new, append-only migration.
- The product's name is the Open Food Facts name with the first brand in front of it (see "Composing the
  name"). Change `composeName` alone if the owner decides otherwise.

## Goal and scope

Today a scanned barcode becomes the product's name as it is (`Scanned` in
`src/app/children/add-products/program.ts`). After this change, the page looks the barcode up on Open Food
Facts, caches the answer in the app's SQLite database, and replaces the barcode in the name field with the
product's name when the product is known. The barcode stays in the field when the product is unknown or the
lookup fails, so that the product can still be added, as now.

In scope: the lookup from a scan, its cache, the texts under the name field, the attribution the licence
requires, the tests, the docs. Out of scope, for a later change: product images, nutrition data, contributing
products to Open Food Facts, looking up a typed barcode (see "Later" at the end), a column linking a stored
product to its barcode.

## The Open Food Facts API, as verified

Endpoint: `GET https://world.openfoodfacts.org/api/v2/product/<code>` with query parameters. Everything below
is **verified** unless marked otherwise.

- **Found**: HTTP 200, body `{"code":"8076800195057","product":{...},"status":1,"status_verbose":"product found"}`.
- **Not found**: body `{"code":"20267422","status":0,"status_verbose":"product not found"}`, no `product` key.
  Recorded first as HTTP 200; on the same day, with `fields`, `app_name` and `app_version`, the server answered
  **HTTP 404** with that body (verified with `curl` and with the client itself). Accept both: decode `status`
  from the JSON of a 2xx or a 404 alike.
- **A non-numeric code** (`/product/abc`) answers HTTP 200 with `"code":""` and no product: never send one.
- **`fields`** selects the keys of `product`. Without it a product is about 135 KB; with
  `fields=product_name,product_name_it,brands,quantity` it is under 300 bytes. Always send `fields`.
- **`lc` does not localize `product_name`**: with `lc=it`, `product_name` stays in the product's main language
  (`"lang":"en"`, `"product_name":"Spaghetti Nº5"`) and the Italian name is the separate key
  `product_name_it`. Request both `product_name_<lang>` and `product_name`, prefer the first.
- **Every key of `product` may be missing or empty**, `product_name` included (products are crowd-sourced).
  `brands` is a comma-separated list (`"Nutella, Ferrero"`); `quantity` is free text (`"400 g e"`, `"355g"`).
- **Code normalization by the server** (and in its docs, "Barcode Normalization"): codes of 9 to 12 digits
  are padded with leading zeros to 13 (`049000006346` and `0049000006346` answer the same product, with
  `"code":"0049000006346"`); codes of 7 digits or fewer are padded to 8; 8 and 13 digits stay as they are. The
  response's top-level `code` is the normalized one.
- **CORS**: `Access-Control-Allow-Origin: *`; the preflight (`OPTIONS`) answers 204. The allowed request
  headers are `DNT, User-Agent, X-User-Agent, X-Requested-With, If-Modified-Since, Cache-Control,
  Content-Type, Range, If-None-Match, Authorization`: **not** `b3` nor `traceparent`, which Effect's
  `FetchHttpClient` adds by default (see "HTTP details").
- **Identification**: the docs ask every app for a `User-Agent` of the form `AppName/Version (contact email)`.
  A browser's `fetch` cannot set `User-Agent` (a forbidden header); the request still succeeds without one
  (verified with `curl -A ""`). How the app identifies itself is in "HTTP details".
- **Rate limits** (docs, not testable): 15 requests per minute per IP for product reads, 10 for searches; an
  IP that exceeds them may be banned; a global overload answers 503 for everyone. The limit is per phone when
  the phone calls the API directly, as here.
- **Staging** `https://world.openfoodfacts.net` needs HTTP basic auth `off:off`. Not used: reads at this
  volume go to production, in development too.
- **Licence**: database under the ODbL, contents under the DbCL, images under CC BY-SA. Reusers must name
  the licence and attribute Open Food Facts with a link to <https://openfoodfacts.org>, and link the
  product's page when showing a specific product's data.

## The user's experience

On the first step of the page that adds products, after a scan:

1. The scanner closes, the name field shows the barcode, and its supporting text (the line under the field,
   where "Camera not available. Type the name" goes) says `Looking up the product…`. Until the answer comes, the
   first step is blocked: the field is disabled, a circular progress indicator takes the place of its clear
   button, "Set expiration" and the scanner's FAB are disabled, the snackbar of the product added last is
   hidden, and a `Cancel` text button takes the place of "Add without date". The app bar's close button and the
   back button leave the page as always. `Cancel` stops the lookup: the barcode stays the name, with no
   supporting text, and the step works again. The lookup gives up after 5 seconds (step 4).
2. **Known product**: the field is drawn anew with the product's name and focused; the supporting text says
   `From Open Food Facts`, where "Open Food Facts" links to the product's page
   (`https://world.openfoodfacts.org/product/<normalized code>`). The text stays until the name is edited,
   cleared or replaced by another scan.
3. **Unknown product**: the barcode stays; the supporting text says `Not on Open Food Facts. Type the name`.
4. **Lookup failed** (offline, timeout, server error, bad answer): the barcode stays; the supporting text says
   `Couldn't reach Open Food Facts. Type the name`.
5. Once the lookup has answered or was cancelled, "Set expiration" and "Add without date" work as before the
   scan, the barcode being a valid name; never while it goes on, so that a product is never added, nor dated,
   under a name about to be replaced.

The camera's "Camera not available. Type the name" keeps its place: it shows when the camera is unavailable
and no lookup text applies (a lookup text comes from a scan, which needs the camera, so the two rarely meet;
when they do, after the camera failed on a later opening, the lookup's text wins).

No retry button in this version: scanning again retries.

## The program (`src/app/children/add-products/program.ts`)

### State

`Form` gains one state machine, `lookup`, kept with the form in every state of the page like `camera` is:

```ts
/** A barcode as the scanner reports it, after the scanner's own normalization (see "Barcodes"). */
export type Lookup = Data.TaggedEnum<{
  /** No lookup: nothing was scanned, or the name was edited since. */
  Idle: object
  /** The product named `barcode` is being looked up: the name field holds the barcode. */
  Looking: Readonly<{ barcode: string }>
  /** The name field holds the product found for `barcode`: `url` is its page, for the attribution. */
  Found: Readonly<{ barcode: string; url: string }>
  /** The name field holds the barcode: Open Food Facts does not know it. */
  NotFound: Readonly<{ barcode: string }>
  /** The name field holds the barcode: the lookup failed. */
  Failed: Readonly<{ barcode: string }>
}>
```

`Form.lookup: Lookup`, initially `Idle`. The invariant, kept by `update` and relied upon by the subscription:
**while `lookup` is not `Idle`, the name field's text is the one the lookup put there** (the barcode, or the
found name). Every message that changes the name by any other way resets `lookup` to `Idle`.

### Messages

- `Scanned { barcode }` (existing, from the scanner subscription): as today sets `maybeName` to the barcode and
  bumps `replacements`, and now also sets `lookup: Looking { barcode }`. When the field already holds that
  barcode (today's "no change" branch), still set `Looking`: the user scanned again to retry. Defect outside
  `Scanning` with the camera on, as today.
- `LookedUp { barcode, outcome }` (new, from the lookup subscription), with
  `outcome: Data.TaggedEnum<{ Found: { name: string; url: string }; NotFound: object; Failed: object }>`,
  where `name` is already composed (see "Composing the name"), non-empty:
  - if `lookup` is not `Looking` with the same `barcode`: **defect** (`defect('LookedUp for a barcode that is not
    being looked up: only the lookup subscription sends it, while its key is in the state')`). The key is the
    barcode, so a mismatch cannot happen in a running program; the tests check it as a defect like `Scanned`.
  - `Found`: `maybeName: Opt.some(name)`, `replacements + 1` (the field is drawn anew and focused),
    `lookup: Found { barcode, url }`.
  - `NotFound`: name unchanged, `lookup: NotFound { barcode }`.
  - `Failed`: name unchanged, `lookup: Failed { barcode }`.
- `NameChanged`, `NameCleared`: as today, plus `lookup: Idle`. `NameChanged` is accepted in every state (a key
  typed under the scanner must not be lost): the reset applies in every state too, which also cancels a
  pending lookup, as wanted.
- Every other message leaves `lookup` as it is: `Completed` keeps the name and so keeps `lookup` (after a
  product was added from a found name, the field still says it comes from Open Food Facts, which is true);
  `BackPressed`, `DateRequested`, `DateDismissed`, `Started`, `Repeated` do not touch the name.

No new command: the lookup is a subscription.

### The subscription

Per the runtime's guide, work that must stop when the state no longer wants it is a subscription, not a
command: the lookup stops when the user types, clears, scans again or leaves the page. It is keyed by what it
depends on:

```ts
subscriptions: ;
;((state) => {
  const always = [['clock', clock], ['date-order', dateOrder], [
    'back-button',
    backButton,
  ]]
  const scanning = isScanning(state) ? [['scanner', scanner]] : []
  const looking = state.form.lookup._tag === 'Looking'
    ? [[
      `lookup:${state.form.lookup.barcode}`,
      lookup(state.form.lookup.barcode),
    ]]
    : []
  return HashMap.fromIterable([...always, ...scanning, ...looking])
})
```

(Write it with `HashMap.make` as the code does today if the array form reads worse; the keys are what
matters.) A new barcode is a new key, so the old lookup is interrupted and the new one starts. The channel
ends with one message, as the scanner's failure does today:

```ts
const lookup = (barcode: string): Tea.Subscription<Message, ProductLookup> =>
  Channel.fromEffectDone(
    Effect.gen(function*() {
      const { lookup } = yield* ProductLookup
      return yield* lookup(barcode).pipe(
        Effect.map(Opt.match({
          onNone: () =>
            Message.LookedUp({ barcode, outcome: { _tag: 'NotFound' } }),
          onSome: (found) =>
            Message.LookedUp({
              barcode,
              outcome: {
                _tag: 'Found',
                name: composeName(found),
                url: found.url,
              },
            }),
        })),
        Effect.catchTag(
          'ProductLookupError',
          (error) =>
            Effect.logWarning('Could not look the product up', error.cause)
              .pipe(
                Effect.as(
                  Message.LookedUp({ barcode, outcome: { _tag: 'Failed' } }),
                ),
              ),
        ),
      )
    }).pipe(Effect.withLogSpan('Lookup')),
  )
```

`Channel.fromEffectDone` exists in Effect 4.0.6 (`effect/Channel`); the scanner subscription uses it today.

Note for the root's tests: a subscription key is matched as a string, so a rehearsal hears it as
`user.hear(['AddProducts', 'lookup:4006381333931'], …)`.

### Composing the name

A pure function of the program (move it to `src/domain` only if a second program needs it):

```ts
/** The product's name as the page proposes it: the first brand, then the name, unless the name already says the brand. */
const composeName = ({ name, maybeBrand }: FoundProduct): string =>
  Opt.match(maybeBrand, {
    onNone: () => name,
    onSome: (brand) =>
      name.toLocaleLowerCase().includes(brand.toLocaleLowerCase())
        ? name
        : `${brand} ${name}`,
  })
```

Examples: `{ name: 'Spaghetti n.5', maybeBrand: Some('Barilla') }` gives `Barilla Spaghetti n.5`;
`{ name: 'Nutella', maybeBrand: Some('Nutella') }` gives `Nutella`; `{ name: 'Coca cola can', maybeBrand:
Some('Coca cola') }` gives `Coca cola can`. The quantity is not used. The result goes through `Product.make`
like a typed name when the product is added: it is not assumed valid.

### The model and the view

`NameShown` gains what the supporting text distinguishes:

```ts
/** The line under the name field. */
export type Supporting = Data.TaggedEnum<{
  Nothing: object
  CameraUnavailable: object
  LookingUp: object
  FromOpenFoodFacts: Readonly<{ url: string }>
  NotOnOpenFoodFacts: object
  LookupFailed: object
}>
```

`makeModel` picks it from `form.lookup` first (`Looking → LookingUp`, `Found → FromOpenFoodFacts`,
`NotFound → NotOnOpenFoodFacts`, `Failed → LookupFailed`), then from `form.camera === 'Unavailable' →
CameraUnavailable`, else `Nothing`. `NameShown.camera` can then go, if nothing else reads it (the scanner's
dialog reads `model.camera` on `Scanning`: keep that one). The view's `nameField` matches the tags and draws the
text, with an `<a>` for `FromOpenFoodFacts` (`href: url`, the same classes as About's links; no `target`:
on Android, Capacitor's WebView hands an external URL to the system browser through an intent, as it does for
About's links, and in the development browser the page is left, as About's links do too); it decides
nothing. The texts are in "The user's experience".

Keep the supporting line in the layout always (an empty `div` of the same height when `Nothing`), so that a
text appearing does not move the field and the FAB; check it on the narrowest phone width, as the `views`
skill says.

## The service (`src/app/children/add-products/services/product-lookup/`)

```ts
// product-lookup.ts
export class ProductLookupError
  extends Data.TaggedError('ProductLookupError')<{ readonly cause: unknown }>
{}

/** What Open Food Facts knows of a product, as the page needs it. */
export type FoundProduct = Readonly<{
  /** The product's name, in the device's language when Open Food Facts has it, never blank. */
  name: string
  /** The first of its brands, never blank. */
  maybeBrand: Opt.Option<string>
  /** Its quantity as written on the package, never blank. */
  maybeQuantity: Opt.Option<string>
  /** The product's page, for the attribution the licence asks for. */
  url: string
}>

export class ProductLookup extends Context.Service<
  ProductLookup,
  {
    /**
     * The product sold under `barcode`, if Open Food Facts knows it: `None` when it does not, or knows it
     * without a name. Fails when the answer cannot be had: no network, a timeout, a server error, an answer
     * that is not one. Answers from the cache when it can (see the adapter): only a miss reaches the network.
     */
    readonly lookup: (
      barcode: string,
    ) => Effect.Effect<Opt.Option<FoundProduct>, ProductLookupError>
  }
>()('<hashed key: let the language service generate it>') {}
```

A one-off read is an `Effect`, not a `Source`. The service key is hashed, as every other (`deterministicKeys`).

### The adapter: `product-lookup.open-food-facts.ts`

Written on two pieces of the infrastructure (below): the `BarcodeCache` store and the `OpenFoodFacts` client.
Its `layer` requires `SqlClient` and `HttpClient`, which it does **not** provide (both have alternatives), the
way `date-order-setting.sql.ts` leaves `SqlClient` out. Algorithm of `lookup(barcode)`:

1. `code = OpenFoodFacts.normalizeCode(barcode)`; when `None` (not digits only), answer `None` without any
   request and without writing the cache: the scanner only reports digits, so this is defensive, logged at
   `debug`.
2. `now = yield* DateTime.now` (Effect's clock, so tests can use `TestClock`).
3. Read the cache row of `code`. A read failure is logged at `warn` and treated as a miss.
   - `found` row: answer `Some(found)` from the row, **no request**, whatever its age.
   - `not_found` row younger than `NOT_FOUND_DAYS = 7` (`looked_up_at + 7 days > now`): answer `None`, no request.
   - older `not_found` row, or no row: go on.
4. Ask the client: `OpenFoodFacts.fetchProduct(code, language)`, `language` being the first subtag of
   `navigator.language` (`'it-IT' → 'it'`), read in the adapter with `Effect.sync`, like `DateOrder.ofLocale`.
5. On failure: fail with `ProductLookupError({ cause })`; **write nothing** (a failure is never cached).
6. On `Some(product)` with a blank name: treat as not found (step 7).
7. On `None`: write the row `{ code, status: 'not_found', looked_up_at: now }` (upsert), answer `None`.
8. On `Some(product)`: write `{ code, status: 'found', name, brands, quantity, language, looked_up_at: now }`
   (upsert, replacing any `not_found` row), answer `Some(found)`.
9. A write failure (7 or 8) is logged at `warn`; the answer is returned anyway.

The whole `lookup` is wrapped in `Effect.withLogSpan('ProductLookup')`; the request has its own timeout (see
"HTTP details"), so the adapter adds none.

## The infrastructure

### The client: `src/infrastructure/open-food-facts/open-food-facts.ts`

A `Context.Service` with `make` and a `static layer` like `ProductStore`, built on `HttpClient`
(`import * as HttpClient from 'effect/http/HttpClient'`, same for `HttpClientRequest`, `HttpClientResponse`).
It is the only module that knows the API's shape.

```ts
/** A code as the server stores it: digits only, padded with leading zeros as the server pads them. */
export const normalizeCode = (raw: string): Opt.Option<string> => {
  if (!/^\d+$/.test(raw)) return Opt.none()
  const digits = raw.replace(/^0+(?=\d)/, '') // strip leading zeros, keep at least one digit
  if (digits.length <= 7) return Opt.some(digits.padStart(8, '0'))
  if (digits.length >= 9 && digits.length <= 12) {
    return Opt.some(digits.padStart(13, '0'))
  }
  return Opt.some(digits) // 8, 13 or more: as it is
}
```

Property to test: `normalizeCode` is idempotent, answers only digits, 8 or at least 13 of them, and `None`
for anything with a non-digit; `'049000006346'` and `'0049000006346'` normalize alike; `'20267422'` stays.
Stripping the zeros first makes `'00012345'` and `'12345'` one key (the server answered `"code":"00012345"`
for `12345`, verified).

```ts
export type Product = Readonly<{ name: string; maybeBrand: Opt.Option<string>; maybeQuantity: Opt.Option<string> }>

/** `fetchProduct(code, language)`: the product under a normalized `code`, named in `language` when the server has it. */
readonly fetchProduct: (code: string, language: string) => Effect.Effect<Opt.Option<Product>, OpenFoodFactsError>
/** The product's page on the site. */
readonly productUrl: (code: string) => string   // `https://world.openfoodfacts.org/product/${code}`
```

`OpenFoodFactsError` is a `Data.TaggedError` with `cause: unknown`. `language` must match `/^[a-z]{2,3}$/`;
anything else falls back to `'en'` (the key `product_name_<language>` goes into the URL).

#### HTTP details

- Base URL from `Config.String('baseUrl').pipe(Config.nested('openFoodFacts'))`, default
  `https://world.openfoodfacts.org` (`Config.withDefault`), the way `sqlite.workerPath` is configured in
  `src/entrypoints/production.ts`: tests and a future staging run can point it elsewhere.
- Request: `HttpClientRequest.get(` ${baseUrl}/api/v2/product/${code}`)` with `HttpClientRequest.setUrlParams`:
  `fields=product_name,product_name_<language>,brands,quantity`, `app_name=fridgy`,
  `app_version=<version from #package.json>`. The two `app_*` parameters are what the docs ask of writes; on
  reads they cost nothing and identify the browser build, which can send no `User-Agent`.
- Headers: none. Do not try `User-Agent` (ignored or rejected by browsers). `Accept: application/json` is
  harmless but not needed (verified: the server answers JSON with `Content-Type: application/json`).
- **Tracing headers off**: the client must run with `HttpClient.TracerPropagationEnabled` set to `false`
  (`Layer.succeed(HttpClient.TracerPropagationEnabled, false)` provided where `FetchHttpClient.layer` is, in
  the entrypoints), otherwise `fetch` adds `b3` and `traceparent`, the preflight fails and every request
  fails from the WebView and the browser. Verified against the server's `Access-Control-Allow-Headers`.
- Timeout: `Effect.timeout('10 seconds')` on the request-and-decode; the `TimeoutError` becomes an
  `OpenFoodFactsError`. Decided without measurement: on a slow mobile network 10 s is the most the user
  waits before typing the name; make it a named constant.
- No retry: a second request a second later rarely helps and counts against the rate limit.
- Status: a 2xx or a 404 is decoded (see "Not found"); any other (503 under global overload) is an error.
- Decoding: `HttpClientResponse.schemaBodyJson(Answer)` with

  ```ts
  const Answer = Schema.Struct({
    status: Schema.Number, // 1 found, 0 not found (verified)
    product: Schema.optionalKey(Schema.Struct({
      product_name: Schema.optionalKey(Schema.String),
      [`product_name_${language}`]: Schema.optionalKey(Schema.String), // build the struct per language, or read it as Schema.Record
      brands: Schema.optionalKey(Schema.String),
      quantity: Schema.optionalKey(Schema.String),
    })),
  })
  ```

  (If a computed key in `Schema.Struct` is awkward, decode `product` as `Schema.Record(Schema.String,
  Schema.Unknown)` and pick the keys by hand; the behaviour below is what matters.) `status !== 1` or no
  `product` is `None`. Otherwise:
  - `name` = the first non-blank of `product_name_<language>`, `product_name`, each passed through
    `NormalizedString.fromString`; none → `None` (a product without a name is unknown to the page).
  - `maybeBrand` = the first comma-separated item of `brands`, normalized, non-blank.
  - `maybeQuantity` = `quantity` normalized, non-blank.
  - Every other key is ignored (`Schema.Struct` ignores extra keys by default; confirm with a test).
- Decoding or a body that is not JSON (an HTML error page from a proxy) is an `OpenFoodFactsError`.
- Log at `debug` the request's code and at `info` a product found or not; never log the whole body.

### The cache: `src/infrastructure/storage/barcodes.ts` and `schema.ts`

In `schema.ts`:

```ts
/** What Open Food Facts answered for a barcode, one row per normalized code: the lookup's cache. */
export const BarcodeLookupSchema = {
  columns: {
    barcode: 'barcode',
    status: 'status',
    name: 'name',
    brands: 'brands',
    quantity: 'quantity',
    language: 'language',
    lookedUpAt: 'looked_up_at',
  },
  table: 'barcode_lookup',
} as const
```

In the first migration (see the decision at the top), after the other tables:

```sql
CREATE TABLE barcode_lookup(
  barcode TEXT PRIMARY KEY,
  status TEXT NOT NULL,          -- 'found' | 'not_found'
  name TEXT,                     -- the name in `language`, or the main one: NULL unless found
  brands TEXT,                   -- as the server gives it, comma-separated: NULL unless found
  quantity TEXT,                 -- NULL unless found
  language TEXT,                 -- the language the name was asked in: NULL unless found
  looked_up_at TEXT NOT NULL     -- ISO 8601, like the other dates
);
```

The raw `name`/`brands`/`quantity` are stored, not the composed name: the composition may change without
refetching. `language` is informative: a cached name stays in the language of the lookup even if the device's
language changes later; accepted, the name is editable.

`BarcodeCache` is a `Context.Service` like `SettingStore`, on `SqlClient`, with:

- `read(code): Effect<Option<Row>, SqlError>`, `Row` decoded with `Schema.Struct` (`status` as
  `Schema.Literals(['found', 'not_found'])`, the nullable columns as `Schema.OptionFromNullishOr`,
  `looked_up_at` as `Schema.DateTimeUtcFromString`);
- `write(row): Effect<void, SqlError>`, `INSERT … ON CONFLICT (barcode) DO UPDATE SET …` like `SettingStore.write`,
  setting every column (a `not_found` row sets the nullable ones to NULL);
- `tables`, for symmetry with the other stores (nothing reacts to this table yet).

Plus `barcodes.test_support.ts` with `readRow(code)` and `writeRow(row)` for the contract tests, like
`settings.test_support.ts`.

The development database (`samples.ts`) gets no sample rows.

## Barcodes: what the scanner reports

`scanner.browser.ts` reads `rawValue` of the first `DetectedBarcode` and the formats `ean_13`, `ean_8`,
`upc_a`, `upc_e`. Two facts matter:

- EAN-13, EAN-8 and UPC-A values are the digits printed under the bars, check digit included: the server's
  normalization handles them (UPC-A gets its leading zero).
- **UPC-E is a compressed 8-digit form** (number system digit, 6 data digits, check digit) of a 12-digit UPC-A.
  Whether the detector's `rawValue` is the 8-digit form or the expanded UPC-A is **not verified**: no
  documentation of the Shape Detection API or ML Kit says it, and the scanner has not run on Android yet
  (`AGENTS.md`, "Known gaps"). An 8-digit UPC-E sent as it is would be padded like an EAN-8 and never match.

So the scanner adapter expands UPC-E itself, from the `format` of the `DetectedBarcode` (add `format: string` to
the adapter's `BarcodeDetector` type), before offering the value: the program and the service only ever see
EAN-8, EAN-13 or UPC-A digits. The expansion is generic, so it goes in `src/libs/barcodes/barcode.ts` with a
test and nothing of the app:

```
UPC-E = N D1 D2 D3 D4 D5 D6 C   (N ∈ {0,1}: number system; C: check digit, the same as the UPC-A's)

D6 = 0, 1, 2:  UPC-A = N D1 D2 D6 0 0 0 0 D3 D4 D5 C
D6 = 3:        UPC-A = N D1 D2 D3 0 0 0 0 0 D4 D5 C
D6 = 4:        UPC-A = N D1 D2 D3 D4 0 0 0 0 0 D5 C
D6 = 5..9:     UPC-A = N D1 D2 D3 D4 D5 0 0 0 0 D6 C
```

`expandUpcE(value: string): Opt.Option<string>`: `None` unless 8 digits with `N` 0 or 1; a 6-digit value (some
readers drop `N` and `C`) is out of scope, `None`. Test: the UPC-A's check digit (odd positions ×3 + even
positions, mod 10, complement) equals `C` for every expansion of a generated valid UPC-E, and the known pair
`04252614` → `042100005264`. In the adapter: when `format === 'upc_e'`, offer `expandUpcE(rawValue)` or, when
`None`, log a warning and offer nothing. Verify on a phone with a UPC-E package before release; if `rawValue`
turns out to be 12 digits already, `expandUpcE` is simply never asked (it returns `None` for 12 digits and the
value is offered as it is: implement that branch, `format === 'upc_e' && rawValue.length === 12`).

## Wiring

- `src/app/children/add-products/layer.ts`: merge the adapter's layer (its `SqlClient` and `HttpClient`
  requirements bubble up, as `SqlClient` does today).
- `src/app/layer.ts`: unchanged in shape; its type now requires `HttpClient` too.
- `src/entrypoints/production.ts` and `development.ts`: provide
  `FetchHttpClient.layer` (`effect/http/FetchHttpClient`) and `Layer.succeed(HttpClient.TracerPropagationEnabled,
  false)` to `App.layer`, next to the `SqlClient`'s engine. Both entrypoints use the real API.
- `capacitor.config.ts`: `android: { appendUserAgent:`Fridgy/${version} (fgaudo@gmail.com)`}`, the version
  imported from `package.json` (the CLI transpiles the config with TypeScript and `require`s it, so a JSON
  import works; fall back to `createRequire(import.meta.url)('./package.json')` if it does not). Then
  `bunx cap sync android`. This is the User-Agent the docs ask for, on the WebView; the browser build sends
  `app_name`/`app_version` only. The owner's email becomes visible in every request's headers: it is what
  Open Food Facts asks for.
- `android/app/src/main/AndroidManifest.xml`: `INTERNET` is already declared; nothing to add.

## Attribution and privacy

- `src/app/children/about/view.tsx`: a line (same style as the version and the repository link) saying
  `Product names from Open Food Facts, under the Open Database License`, with "Open Food Facts" linking to
  <https://openfoodfacts.org> and "Open Database License" to <https://opendatacommons.org/licenses/odbl/1-0/>.
  The licenses list is generated from npm packages and cannot carry it.
- The supporting text `From Open Food Facts` with the product's link is the per-product attribution.
- `README.md`: a sentence in the status paragraph (a scanned barcode is looked up on Open Food Facts, cached
  locally) and a "Privacy" line: scanning sends the barcode, and the phone's IP, to Open Food Facts; nothing
  else leaves the phone.
- The local cache is a derivative database that is never distributed: the ODbL's share-alike asks nothing
  of it; the app's source is public anyway.

## Tests

Follow `AGENTS.md`'s "Tests" and the skills; what is specific to this change:

**`src/libs/barcodes/barcode.test.ts`**: `expandUpcE` as above, with a `barcode.test_arbitrary.ts` producing
valid UPC-E values.

**`open-food-facts.test.ts`** (infrastructure): `normalizeCode`'s properties; `fetchProduct` against a fake
`HttpClient` made with `HttpClient.make((request) => Effect.succeed(HttpClientResponse.fromWeb(request, new
Response(json, { status, headers: { 'content-type': 'application/json' } }))))` with the three bodies recorded
in "The Open Food Facts API, as verified" (found with every field, found with `product_name` missing or
blank, not found), a 503, a non-JSON body, and a fake that never answers (`Effect.never`) for the timeout,
under `TestClock` (`effect/testing/TestClock`: `TestClock.layer()` and `TestClock.adjust('10 seconds')`).
Also: the request's URL carries `fields`, `app_name`, `app_version` and the code; the request carries no
`b3`/`traceparent` when `TracerPropagationEnabled` is false (inspect `request.headers` in the fake).

**`product-lookup.test_contract.ts`** and **`product-lookup.open-food-facts.test.ts`**: the contract takes the
adapter's layer, the cache's test support and a fake client it can script and count (the test builds the
`OpenFoodFacts` layer on a counting fake `HttpClient`, or provides a fake `OpenFoodFacts` service directly; the
latter is simpler and enough, since the client has its own tests). Properties:

- a found product answers `Some` with the name in the device language when present, else the main one, the
  first brand, the quantity, and the product's URL;
- a second lookup of the same code, and of a code that normalizes to it, makes no request (count 1);
- a `not_found` answer is cached: a second lookup makes no request; after `TestClock.adjust('8 days')` it does;
- a `found` answer is still served after any time without a request;
- a failed request fails with `ProductLookupError` and writes no row; the next lookup requests again;
- a non-digit barcode answers `None` with no request and no row;
- a found product whose stored row was written by a previous version with a blank name (write the row by
  hand) is not served: the adapter treats a `found` row with a blank name as a miss (defensive: add this rule to
  step 3 of the algorithm).

**`add-products/program.test.ts`**: extend `cannotArrive` with `LookedUp` outside `Looking` for its barcode;
one test per message as listed in "Messages"; `subscriptionsOf(program)(state)` has `lookup:<barcode>` exactly
when `lookup` is `Looking`; `makeModel` picks the supporting text as stated, for any state; the view test's
`askable` list is unchanged (no new user message), `messagesSentBy` must still find no violation. Extend
`program.test_arbitrary.ts` with `lookup` (every variant, the barcode often equal to the name, as the
invariant has it).

**`src/app/program.test.ts`**: the scenario "a barcode read by the scanner names the product added" becomes:
scan `4006381333931`, `hear(['AddProducts', 'lookup:4006381333931'], LookedUp Found 'Milk')`, add, back; the
list says `Milk`. Add: not found keeps the barcode; `NameChanged` while looking drops the subscription
(`subscriptionsOf` after typing has no `lookup:` key). In `user.test_support.ts`, provide a fake
`ProductLookup` the way the fake `Scanner` is provided (merged after `App.layer`, so it wins), and provide an
`HttpClient` to `App.layer` so that the real adapter's layer can be built: `FetchHttpClient.layer` is fine (no
request is ever sent, the fake service wins), or `Layer.succeed(HttpClient.HttpClient, HttpClient.make(() =>
Effect.die('No network in tests')))`.

## Documentation to update with the change

- `AGENTS.md`, "Known gaps": remove "no lookup of the product"; add "the lookup, the WebView's User-Agent and
  UPC-E expansion have not been tried on Android" until they are.
- `README.md`: status paragraph, privacy line, and the `docs/` folder if this file stays.
- `src/README.md`: the tree (`infrastructure/open-food-facts/`, `storage/barcodes.ts`, `libs/barcodes/`) and
  the entrypoints' line (they also pick the HTTP client).
- `.agents/skills/add-service/SKILL.md`: `HttpClient` joins the `SqlClient` and the `BackButton` as an
  adapter with alternatives that the entrypoints provide; the `OpenFoodFacts` client as the example of a
  platform call that lives in the infrastructure.
- This file: mark it implemented, or delete it, when the change lands.

## Order of work

Each step leaves the typecheck, the lint and the tests green:

1. `src/libs/barcodes/` (UPC-E expansion) and its use in `scanner.browser.ts`.
2. `schema.ts`, the migration, `storage/barcodes.ts` with its test support.
3. `infrastructure/open-food-facts/` with its tests on a fake `HttpClient`.
4. The service, its adapter, the contract and the adapter's test.
5. The program, the arbitraries, the model, the view, the page's tests, the root's tests and test support.
6. The entrypoints, `capacitor.config.ts` + `cap sync`, the About page, the docs.
7. On Android (needs the Capacitor 9 build from "Known gaps"): scan a product known to Open Food Facts, one
   unknown, one UPC-E, one in airplane mode; check in the device's logs that the request carries the appended
   User-Agent and that no CORS error appears.

## Later, not in this change

- Looking up a typed name of 8, 12 or 13 digits (with a valid check digit): makes the feature usable on a
  desktop and on phones without a camera; needs a debounce, and the rate limit in mind.
- A retry action on `Failed`.
- Refreshing `found` rows older than some months, serving the stale row when the refresh fails.
- Storing the barcode with the product, for images or a later re-lookup.

## As implemented

Where the code departs from the design above:

- **Tracing headers** are turned off by the client itself (`Effect.provideService(HttpClient.TracerPropagationEnabled,
  false)` around the request in `open-food-facts.ts`), not by the entrypoints: `TracerPropagationEnabled` is a
  reference read from the fiber that sends the request, a subscription's, which a layer provided to `App.layer`
  does not reach; and the server's CORS headers are a fact of the API, which the client is the module to know.
  The entrypoints provide only `FetchHttpClient.layer`.
- **The client's `Product` carries every brand** (`brands`, the non-blank ones in the server's order), not
  `maybeBrand`: the cache stores them comma-separated, as the design's table says, and the adapter takes the
  first for `FoundProduct.maybeBrand`.
- **`productUrl`** is built on the configured base URL, which defaults to the production site.
- **The adapter** exports `layerOnClient` (on a given `OpenFoodFacts`, for the contract's fake server) beside
  `layer`; the device's language falls back to `Intl`'s locale where `navigator.language` is missing (Bun).
- **`bunx cap sync android`** was not run: the synced `capacitor.config.json` is ignored by git and written by the
  release's build (`android-release` skill); `bunx cap config` shows the appended User-Agent.
- **The first step is blocked while the lookup runs**, with a `Cancel` button (`LookupCancelled`). In the design
  the step stayed usable: "Add without date" saved the product under the barcode while the found name arrived a
  moment later, and "Set expiration" carried the barcode to the date step. The lookup is a state of the page,
  `LookingUp { form, barcode }`, as the runtime's guide asks of an operation, not the `Looking` case of
  `Form.lookup`, which keeps only the answer (`Idle | Found { url } | NotFound | Failed`): `update` rejects the
  step's other messages while looking, instead of the view withholding them, and the subscription is keyed by
  the state's barcode. A key typed just before the scan leaves the state, as it drops the answer. Cancelling
  returns to `Naming`: the runtime interrupts the subscription, which aborts the request, and nothing it sent
  reaches `update` afterwards, so no stale answer needs handling. The snackbar is hidden rather than shown
  without its action: the scanner, which the lookup follows, hides it too.
- **The timeout is 5 seconds**, not 10: the user now waits on a blocked screen rather than typing meanwhile, and
  `Cancel` is there for a slower network.
- `src/app/children/add-products/program.ts` grows past 800 lines and stays one program: its parts share one
  form and one submission (`AGENTS.md`, "A program is split by concern").
