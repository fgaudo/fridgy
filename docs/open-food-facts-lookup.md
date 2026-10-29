# Design: naming a scanned product from Open Food Facts

> **Written for the web build.** This design predates the move to React Native (2026-10-29). What it decides of
> the program, its states, messages and services stands; what it says of the view (snabbdom, `styles.css`, the
> WebView, Capacitor, the browser) describes the web build, and is drawn again on React Native as the `views`
> skill says.
> The scanner was brought back on React Native on 2026-10-30, on the app's own camera (see "Barcodes").

Implemented on 2026-10-27; the lookup and the scanner tried on Android in the emulator (see "Verified, and not").
The code is the page that adds products (`src/app/children/add-products/`, its `product-lookup` service and the
scanner adapter), the camera `src/infrastructure/barcode-camera/` with its native module, the client
`src/infrastructure/open-food-facts/` and the cache `src/infrastructure/storage/barcodes.ts`. Read [`AGENTS.md`](../AGENTS.md), the `add-service` and `add-program`
skills and the "Guide" of `node_modules/@fgaudo/effect-tea/README.md` before changing them. Every fact about the
Open Food Facts API below was checked against the live server on 2026-10-27 with `curl`; re-check what the code
relies on (marked **verified**) before trusting it, the API may have moved.

## What it does

A scanned barcode is looked up on Open Food Facts, the answer is cached in the app's SQLite database, and the
name field, emptied by the scan, takes the product's name when the product is known. When it is unknown or the
lookup fails, the field stays empty, for the user to type the name. Out of scope:
product images, nutrition data, contributing products to Open Food Facts, looking up a typed barcode, a column
linking a stored product to its barcode (see "Later").

## Decisions

- **The first step is blocked while the lookup runs**, with a `Cancel` button. The lookup is a state of the page
  (`LookingUp { form, barcode }`), as the runtime's guide asks of an operation; the form keeps only the answer
  (`lookup: Idle | Found { url } | NotFound | Failed`). `update` rejects the step's other messages while looking,
  instead of the view withholding them, so that a product is never added, nor dated, under a name about to be
  replaced. The first design let the step work meanwhile ("Add without date" saving the product under the
  barcode while the found name arrived a moment later); the blocked step was chosen as the simpler state.
- **A scan empties the name**, and only a product found fills it. A barcode is no name anyone recognizes a
  product by, and a name typed before the scan, kept after an unknown product, could be added by a tap made
  before the user read the answer: an empty name cannot be added at all. The first design put the barcode in the
  field and kept it there when nothing was found.
- **The answer is told in the field's supporting text, never in the error's colors**: Material's error state
  says that the field's content is wrong, and a product unknown to Open Food Facts is an ordinary outcome. The
  barcode is in the text while looking it up and when it is unknown, so that a misread code shows.
- **The lookup is a subscription, keyed by the barcode** (`lookup:<barcode>`, which the root's tests hear by that
  key). Work that must stop when the state no longer wants it is a subscription, not a command: it stops when
  the user types, cancels, scans again or leaves the page. Cancelling returns to `Naming`: the runtime interrupts
  the subscription, which aborts the request, and nothing it sent reaches `update` afterwards, so no stale answer
  needs handling. A key typed just before the scan leaves the state, as it drops the answer.
- **The invariant** `update` keeps and the subscription relies upon: while `lookup` is not `Idle`, the name
  field's text is the one the lookup left there (the found name, or none). Every message that changes the
  name by any other way resets `lookup` to `Idle`; `Completed` keeps the name and so keeps `lookup` (after a
  product was added from a found name, the field still says it comes from Open Food Facts, which is true).
- **`LookedUp` for a barcode not being looked up is a defect**: only the subscription sends it, while its key is
  in the state, so a mismatch cannot happen in a running program.
- **The timeout is 5 seconds** (`TIMEOUT` in the client), no retry: a second request a second later rarely helps
  and counts against the rate limit, and `Cancel` is there for a slower network. Scanning again retries.
- **The name is the first brand, then the name, unless the name already says the brand** (`composeName`, a pure
  function of the program): `Barilla` + `Spaghetti n.5` gives `Barilla Spaghetti n.5`; `Nutella` + `Nutella`
  gives `Nutella`; `Coca cola` + `Coca cola can` gives `Coca cola can`. The quantity is not used. The result goes
  through `Product.make` like a typed name: it is not assumed valid.
- **The cache stores the raw fields** (name, brands, quantity, language), not the composed name, so that the
  composition may change without refetching. A `found` row is served whatever its age; a `not_found` row for
  `NOT_FOUND_DAYS` (7); a failure is never cached; a `found` row with a blank name (written by an older build)
  is a miss. The cached name stays in the language of the lookup even if the device's language changes later:
  accepted, the name is editable.
- **The cache table went into the first migration**, not a new one: no published build ran the schema then. A
  change now is a new, append-only migration.
- **Tracing headers are turned off by the client itself** (`HttpClient.TracerPropagationEnabled` provided around
  the request), not by the entrypoints: the reference is read from the fiber that sends the request, a
  subscription's, which a layer provided to `App.layer` does not reach; and the server's CORS headers are a fact
  of the API, which the client is the module to know. The entrypoints provide only `FetchHttpClient.layer`.
- **Effect's `effect/http` module** (`HttpClient`, `FetchHttpClient`), marked `@stability unstable`, may be used:
  the app already depends on unstable modules.
- **The app identifies itself** as the API's docs ask: the client sends the User-Agent
  `Fridgy/<version> (<owner's email>)`, the email being what Open Food Facts asks for and visible in every request's
  headers, and the `app_name` and `app_version` query parameters. (The web build appended the User-Agent to the
  WebView's own, through Capacitor, and the browser, which can send none, the parameters only.)
- **Reads go to the production API, in development too**: the staging server needs basic auth and reads at this
  volume do not need it. The base URL is configured (`openFoodFacts.baseUrl`), for tests and a future staging run.

## The Open Food Facts API, as verified

Endpoint: `GET https://world.openfoodfacts.org/api/v2/product/<code>` with query parameters. Everything below
is **verified** unless marked otherwise.

- **Found**: HTTP 200, body `{"code":"8076800195057","product":{...},"status":1,"status_verbose":"product found"}`.
- **Not found**: body `{"code":"20267422","status":0,"status_verbose":"product not found"}`, no `product` key.
  Recorded first as HTTP 200; on the same day, with `fields`, `app_name` and `app_version`, the server answered
  **HTTP 404** with that body (verified with `curl` and with the client itself). The client accepts both: it
  decodes `status` from the JSON of a 2xx or a 404 alike.
- **A non-numeric code** (`/product/abc`) answers HTTP 200 with `"code":""` and no product: the client never sends
  one.
- **`fields`** selects the keys of `product`. Without it a product is about 135 KB; with
  `fields=product_name,product_name_it,brands,quantity` it is under 300 bytes. The client always sends `fields`.
- **`lc` does not localize `product_name`**: with `lc=it`, `product_name` stays in the product's main language
  (`"lang":"en"`, `"product_name":"Spaghetti Nº5"`) and the Italian name is the separate key
  `product_name_it`. The client requests both `product_name_<lang>` and `product_name`, and prefers the first.
- **Every key of `product` may be missing or empty**, `product_name` included (products are crowd-sourced): a
  product without a name is unknown to the page. `brands` is a comma-separated list (`"Nutella, Ferrero"`);
  `quantity` is free text (`"400 g e"`, `"355g"`).
- **Code normalization by the server** (and in its docs, "Barcode Normalization"): codes of 9 to 12 digits
  are padded with leading zeros to 13 (`049000006346` and `0049000006346` answer the same product, with
  `"code":"0049000006346"`); codes of 7 digits or fewer are padded to 8; 8 and 13 digits stay as they are. The
  response's top-level `code` is the normalized one. `normalizeCode` in the client does the same, stripping the
  leading zeros first so that `'00012345'` and `'12345'` are one key (the server answered `"code":"00012345"`
  for `12345`); it is the cache's key and the product page's code.
- **CORS**: `Access-Control-Allow-Origin: *`; the preflight (`OPTIONS`) answers 204. The allowed request
  headers are `DNT, User-Agent, X-User-Agent, X-Requested-With, If-Modified-Since, Cache-Control,
  Content-Type, Range, If-None-Match, Authorization`: **not** `b3` nor `traceparent`, which Effect's
  `FetchHttpClient` adds by default. With them, the preflight fails and every request fails from the WebView and
  the browser: hence the decision above.
- **Identification**: the docs ask every app for a `User-Agent` of the form `AppName/Version (contact email)`.
  A browser's `fetch` cannot set `User-Agent` (a forbidden header); the request still succeeds without one
  (verified with `curl -A ""`). `Accept: application/json` is not needed: the server answers JSON with
  `Content-Type: application/json`.
- **Rate limits** (docs, not testable): 15 requests per minute per IP for product reads, 10 for searches; an
  IP that exceeds them may be banned; a global overload answers 503 for everyone. The limit is per phone when
  the phone calls the API directly, as here.
- **Staging** `https://world.openfoodfacts.net` needs HTTP basic auth `off:off`.
- **Licence**: database under the ODbL, contents under the DbCL, images under CC BY-SA. Reusers must name
  the licence and attribute Open Food Facts with a link to <https://openfoodfacts.org>, and link the
  product's page when showing a specific product's data.

## The user's experience

On the first step of the page that adds products, after a scan:

1. The scanner closes, the name field is emptied, and its supporting text (the line under the field, where
   "Camera not available. Type the name" goes) says `Looking up <barcode>…`. Until the answer comes, the
   first step is blocked: the field is disabled, a circular progress indicator takes the place of its clear
   button, "Set expiration" and the scanner's FAB are disabled, and a `Cancel` text button takes the place of
   "Add without date". The app bar's close button and the back button leave the page as always. `Cancel` stops
   the lookup: the name stays empty, with no supporting text, and the step works again. The lookup gives up after
   5 seconds (step 4).
2. **Known product**: the field is drawn anew with the product's name and focused; the supporting text says
   `From Open Food Facts`, where "Open Food Facts" links to the product's page
   (`https://world.openfoodfacts.org/product/<normalized code>`). The text stays until the name is edited,
   cleared or replaced by another scan.
3. **Unknown product**: the name stays empty; the supporting text says
   `<barcode> isn't on Open Food Facts. Type the name`.
4. **Lookup failed** (offline, timeout, server error, bad answer): the name stays empty; the supporting text says
   `Couldn't reach Open Food Facts. Type the name`. The barcode is left out: it is not the cause.
5. Once the lookup has answered or was cancelled, "Set expiration" and "Add without date" work as before the
   scan, once a name is typed.

The camera's "Camera not available. Type the name" keeps its place: it shows when the camera is unavailable
and no lookup text applies (a lookup text comes from a scan, which needs the camera, so the two rarely meet;
when they do, after the camera failed on a later opening, the lookup's text wins). The supporting line stays in
the layout always (an empty line of the same height), so that a text appearing does not move the field and the
FAB. The product's link has no `target`: on Android, Capacitor's WebView hands an external URL to the system
browser through an intent, as it does for About's links, and in the development browser the page is left.

## The lookup, from the scan to the cache

- **The scanner adapter** (`scanner.react-native.ts`) offers the digits of an EAN-8 or an EAN-13 only: a UPC-A
  and a UPC-E arrive as the EAN-13 they stand for (see "Barcodes"). The program and the service never see anything else; the lookup's adapter still
  answers `None` to a non-digit barcode without a request, defensively.
- **The service** `ProductLookup` is a one-off read, an `Effect`, not a `Source`: `Some(found)` with the name in
  the device's language when Open Food Facts has it, else the main one, the first brand, the quantity and the
  product's page; `None` when the product is unknown or has no name; `ProductLookupError` when the answer cannot
  be had. The device's language is the first subtag of `navigator.language` (`it-IT` → `it`), with `Intl`'s
  locale where `navigator` is missing (Bun).
- **The adapter** (`product-lookup.open-food-facts.ts`) reads the cache under the normalized code first (a read
  failure is logged and treated as a miss), asks the client only on a miss or a stale `not_found` row, writes the
  answer back (a write failure is logged, the answer returned anyway), and fails without writing when the request
  fails. Its layer leaves `SqlClient` and `HttpClient` out, as both have alternatives; `layerOnClient` takes a
  given `OpenFoodFacts`, for the contract's fake server.
- **The client** (`OpenFoodFacts`, on `HttpClient`) is the only module that knows the API's shape: the request
  with `fields`, `app_name` and `app_version`, no headers, the timeout, the decoding of a 2xx or a 404 (any other
  status, a body that is not JSON, such as an HTML error page from a proxy, or one that is not the API's, is an
  `OpenFoodFactsError`), and `productUrl` on the configured base URL. It logs the request's code at `debug` and a
  product found or not at `info`, never the whole body. Its `Product` carries every non-blank brand in the
  server's order; the adapter takes the first.
- **The cache** (`BarcodeCache`, the table `barcode_lookup`, one row per normalized code) stores the status, the
  raw name, brands and quantity, the language the name was asked in, and when it was looked up. Nothing reacts
  to the table. The development database gets no sample rows.

## Barcodes: what the scanner reports

The camera is a native module of the app (`android/app/src/main/java/net/gaudo/fridgy/barcodecamera`): CameraX
frames the back camera, and zxing-cpp 3.1.1 reads each frame for an EAN-13, an EAN-8, a UPC-A or a UPC-E. Both are
under Apache-2.0, and read on the phone, with no Play services: Google's ML Kit, which the libraries of React
Native's cameras read with, ships under Google's terms, which an AGPL app cannot pass on (decided on 2026-10-30).
The module sends each code read as an event, for as long as the stream (`reads`, in `barcode-camera.ts`) is
consumed: the scanner's subscription. The view draws only where the camera shows (`BarcodeCameraPreview`), so the
codes never pass through it, and the program kept its states and messages. The camera's permission is asked by
`start`, the first time the scanner opens in a visit of the page; a refusal fails the stream, and the scanner says
`Camera not available. Type the name`.

The codes come as zxing-cpp gives them, which is what Open Food Facts reads:

- an EAN-13 and an EAN-8 as the digits printed under the bars, check digit included;
- **a UPC-A as an EAN-13**, with its leading 0, and **a UPC-E as the EAN-13 of the UPC-A it compresses**
  (`ODMultiUPCEANReader.cpp`: `"0" + ConvertUPCEtoUPCA`, as ISO/IEC 15420 asks). The web build's detector gave a
  UPC-E's 8 digits, which Open Food Facts would pad like an EAN-8, and the app expanded them itself; zxing-cpp
  needs none of it.

## Attribution and privacy

- The About page says `Product names from Open Food Facts, under the Open Database License`, with "Open Food
  Facts" linking to <https://openfoodfacts.org> and "Open Database License" to
  <https://opendatacommons.org/licenses/odbl/1-0/>. The licenses list is generated from npm packages and cannot
  carry it.
- The supporting text `From Open Food Facts` with the product's link is the per-product attribution.
- `README.md` says that scanning sends the barcode, and the phone's IP, to Open Food Facts, and that nothing else
  leaves the phone.
- The local cache is a derivative database that is never distributed: the ODbL's share-alike asks nothing
  of it; the app's source is public anyway.

## Verified, and not

The client against the recorded answers, the adapter's cache rules under `TestClock`, the page and the root's
scenarios are tested (`bun test`); the flow was seen in a browser. On a desktop without the Shape Detection API
(Chrome on Windows), the scan button is disabled and the name field says why. On Android, in the emulator on 2026-10-28 (API
29 and 37): the WebView's `navigator.userAgent` ends with the `Fridgy/<version> (<email>)` that `capacitor.config.ts` appends, and a request
for `8076800195057` from the app's origin answered with the product and no CORS error. In the emulator on
2026-10-29 (API 37, WebView 156, the host's webcam as the back camera, codes shown on a screen): the camera's
permission is asked once; `3017620422003` is read and named "Nutella", `From Open Food Facts`; an unknown code
shows `Not on Open Food Facts`; the UPC-E `04252614` is read and offered as `042100005264`; in airplane mode the
lookup shows `Couldn't reach Open Food Facts`. The detector, run in the WebView's DevTools on a generated image
of each code, reports `3017620422003` as `ean_13` and `04252614` as `upc_e`, 8 digits. A blurred UPC-E was once
misread as another valid one (`04751610`): its check digit guards little.

On React Native, in the emulator on 2026-10-30 (API 37, the release build, the host's webcam as the back camera):
the camera's permission is asked on the first opening of the scanner; a refusal shows `Camera not available. Type
the name`; once granted, the camera shows in the frame in about two seconds, and `8076800195057`, shown on a
screen, is read and named "Barilla Spaghetti Nº5", `From Open Food Facts`. Not yet on React Native: a UPC-E, an
unknown code, airplane mode, and a phone's own camera. The preview leaves a dark band above and below the webcam's
picture, which may be the emulator's frame.

## Later, not in this change

- Looking up a typed name of 8, 12 or 13 digits (with a valid check digit): makes the feature usable on a
  desktop and on phones without a camera; needs a debounce, and the rate limit in mind.
- Names remembered per barcode, after the release and only if typing unknown products proves a nuisance.
  Discussed on 2026-10-29: a checkbox under the field, `Remember this name for <barcode>`, unticked by default,
  when the name is not Open Food Facts' (unknown, or found and edited); the name is stored when the product is
  added. Never remembered implicitly: a name may hold a one-off note (`2 milk`). The remembered name wins over
  Open Food Facts (a choice of the user's, instant and offline); `Your name for this barcode · Forget` under the
  field, where `Forget` deletes it and looks the barcode up. No page to manage them until use asks for one.
- A retry action on `Failed`.
- Refreshing `found` rows older than some months, serving the stale row when the refresh fails.
- Storing the barcode with the product, for images or a later re-lookup.
