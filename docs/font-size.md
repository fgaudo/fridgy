# Design: the user's font size

Implemented on 2026-10-29, in `android/app/src/main/java/net/gaudo/fridgy/TypeScale.kt`, the type scale of
`src/styles.css` and the views. Read [`AGENTS.md`](../AGENTS.md) and the `views` skill before changing it.

## Decisions

- **Text scales as Android scales it.** Android's "Font size" goes up to 200% from Android 14, and scales
  nonlinearly there: small text grows more than large (at 200%, 11sp becomes 22dp, 16sp 28dp, 32sp about 40dp,
  57sp about 62dp). The WebView's own text zoom multiplies every font by the same factor, which made titles,
  headlines and the keypad's digits grow as much as body text and fill the narrow screens. So `TypeScale`, a
  Capacitor plugin of the app, turns the WebView's zoom off (`textZoom` 100) and gives the page each size of
  Material's type scale as Android converts it (`TypedValue.applyDimension` in sp, in dp), as `--sp-<size>`
  on `:root`. Below Android 14 the conversion is linear, as the zoom was.
- **Before the page's first script.** The plugin loads before Capacitor loads the page, and adds a document start
  script (`WebViewCompat.addDocumentStartJavaScript`) that adopts a style sheet of its own: at that moment the
  document may have no element to style. A change of the setting recreates the activity (`fontScale` is not
  among the manifest's `configChanges`), and the plugin with it.
- **A recreation leaves one page.** The new activity loads its page while the old one's may still run. The old
  page's SQLite worker holds the database's access handles, and a second worker cannot open it.
  - Capacitor destroys a WebView only when the activity's window detaches, which a recreation can skip. An
    activity recreated during its launch never added its window. One recreated by `recreate()` hands its window
    to the new activity; the system does so only for a change of size alone, which `configChanges` handles. The
    old page then lived on for good. In `onDestroy`, `MainActivity` destroys the WebView at once when it is in
    no window, and when the WebView itself leaves its window otherwise. Capacitor waits for the window because a
    WebView must not be destroyed while in one, so the usual path is unchanged.
  - The worker opens the database under a Web Lock, which the browser releases with the worker. The new page
    waits for the old one's worker to be terminated: a few milliseconds on API 37.
  - The wait is bounded (10 s). A page that keeps the database is a bug, and the waiting page shows the crash
    screen instead of the splash screen for good.
  - A worker that fails reports it as its uncaught error, and the page's storage layer dies of it: the client of
    `@effect/sql-sqlite-wasm` would otherwise wait for the worker's "ready" message forever.

  Seen on 2026-10-29 on API 37: the font size changed within a second of the launch left the splash screen up
  for good, both workers failing to open the database.
- **The type scale reads the sizes.** Each `--text-<role>` of `src/styles.css` is `var(--sp-<size>, <rem>)`, the
  sp itself in a browser, where nothing sets them; its line height is the same multiple of it as in Material's
  scale, as Android 14 scales a line height with its text. Text that names no role is `body-large`, set on
  `body`, so that it scales too.
- **Icons and lengths do not scale**, as on Android, where they are dp: icons stay 24dp, the keypad's keys 56dp,
  the margins, paddings and the spaces between blocks and rows fixed. A box around text grows with it, by the
  text alone: its height is a minimum (`min-h-*`) and its vertical padding Material's, less its border, so that
  at 100% nothing changes. The room above an outlined field (`label-room`) is half its floating label's line, so
  that the label stays clear of what is above. Products' avatar takes its size from its two lines of text, with
  a margin (×1.3) chosen to keep the look it had at 200% before: Material's own avatar stays 40dp.
- **Compared with a native app.** On 2026-10-29, on API 37 at 320×712dp, Settings' lines grew 1.72× (an item's
  title) and 1.84× (its summary) from 100% to 200%, and the space between two items stayed 48dp; Fridgy's grew
  1.75× (16sp) and 1.86× (14sp). Spaces in `em`, growing with the text, were tried and left out: no native app
  does it.

## Known limits

- **The pages scroll at 200%.** On 320×712dp, the columns of the second step of `add-products` and of the page
  that edits a product are taller than the screen, by about 95dp, and scroll; their button is docked under them,
  16dp above the navigation bar or the keyboard (seen on 2026-10-29 on API 37).

## Verified, and not

On 2026-10-29, in the emulator on API 37 at 200%: the sizes of the scale as above, the root still 16px, icons
24px; every page laid out with no text overlapping its box (fields, segments, chips, rows, Products' avatar). The
production bundle at 100% fits 320×640 as before (`bun run e2e`). Not yet seen on API 29, whose largest font
size is 130%, linear.

On 2026-10-29, the recreation: the font size or the bold text changed from 0.2 s to 1.6 s after a cold launch,
while the app runs, while it is in the background, four times in a row, and the app left with the back button
and launched again; on API 37, `recreate()` while the app runs, from a temporary trigger. On API 37 and API 29,
every case left one page in the WebView's DevTools, showing the app. In
headless Chromium, 110 handovers between two pages of one database all started the second.
