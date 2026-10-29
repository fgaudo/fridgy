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
