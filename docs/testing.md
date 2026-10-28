# Design: how the app is tested

Decided on 2026-10-28. This document says which checks the app has, what each one covers and what none of
them does, and why a release is checked where it is. How a test is written is in [`AGENTS.md`](../AGENTS.md)
("Tests") and in the "Guide" of `node_modules/@fgaudo/effect-tea/README.md`; the commands, and how the
emulator is set up, are in the `android-release` skill. What this design asks for and does not exist yet is
listed under "Known gaps" in `AGENTS.md`, not here.

## Decisions

- **Three layers, each for what the others cannot reach.** The tests on every change cover the logic; one run of
  the production bundle in a browser covers what only the bundle has; one pass in the emulator covers what
  only Android has. A check that a lower layer can make is never made in a higher one, which costs more and
  tells less.
- **The floor of the WebView is a number checked on the bundle, not a device tested.** `minWebViewVersion`
  (`capacitor.config.ts`) has one job: on an older WebView, Capacitor shows `src/error.html` instead of an app
  that fails half-way. The app is never run on that version. Why:
  - nobody is there. On a phone with the Play Store the WebView updates every month, on its own; a WebView
    three years old is a phone that has been off for three years. A phone without the Play Store cannot
    install the app from it in the first place.
  - what breaks there breaks whole. The bundle is not transpiled (`Bun.build`, the `ESNext` target): a syntax
    the WebView lacks fails the parse, and the app is a blank page. That is a question about text, answered by
    a parser on `dist/` in a second (the floor check in the `android-release` skill), not by an emulator.
  - an old WebView in the emulator speaks of the emulator. Its build is an x86 one from the year of that
    version, run on an emulated GPU; that its renderer dies there (seen on 2026-10-28, on 114) says nothing
    about a phone, and cannot be told apart from a bug of the app.
  - the residual risk is accepted. An API or a CSS feature the WebView lacks fails only where it is used (a
    list that does not snap back, a shadow that is not drawn): the comment on `minWebViewVersion` lists what
    needs the highest version, and that list is re-derived when the number moves. No tool checks it.
- **The lowest Android is tested only when what differs between Android versions changes.** From Android 10
  to the target, the web platform is the same WebView, from the same store; what differs is the system: the
  insets, the back dispatcher, the permissions, the backup. Those change with `minSdkVersion`, with Capacitor
  and with its plugins, not with the app's pages. So a release is checked on the target image; the lowest
  image is checked after a change of one of those three, and the result stays true until the next.
- **The emulator runs the WebView phones have.** The image's own, brought up to date by the Play Store. The
  old rule, which installed `minWebViewVersion` by hand, proved the floor at the price of never seeing the app
  on the WebView any user runs.
- **A doubt about the platform is settled once.** Whether a vibration feels like the constant it stands for,
  whether a backup restores the database, how the detector reports a UPC-E: a fact of Android, checked in one
  emulator pass, written down (in the design that depends on it, or in the code's comment) and taken off
  "Known gaps". What the emulator pass repeats at every release is only what a change of the app can break.
- **The checks are the same for a person and for a machine.** Every check below names what it covers, so that
  one that becomes automatic (the production bundle in a browser, meant for CI) replaces the manual one
  without a second list.

## The layers

| Layer                                   | When                              | Covers                                                                                                                                                                                                  | Does not cover                                                                                           |
| --------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| The tests (`bun test`, typecheck, lint) | every change                      | every program's transitions, commands and subscriptions; every service through its contract, on each adapter; the domain; the root as a user over a database in memory (`src/app/user.test_support.ts`) | the production entrypoint, the build, the worker, the OPFS database, a browser, a screen                 |
| The production bundle in a browser      | every push (CI), before a release | `dist/` as built: the entrypoint `src/entrypoints/production.ts`, the SQLite worker on OPFS, the bundle parsing (the floor check) and running; that no page scrolls on the reference screen (320×640)   | the system bars, the keyboard, the back button, the camera, the vibrations, the backup, the font at 200% |
| The emulator, on the target image       | before a release                  | what only Android has (the list below)                                                                                                                                                                  | the lowest Android, unless `minSdkVersion`, Capacitor or a plugin changed since the last pass            |

### The tests on every change

What `AGENTS.md` "Tests" describes. They are the layer that grows with the app: a behaviour is specified here
first, and the two layers above only confirm that the bundle and the platform carry it.

### The production bundle in a browser

One end-to-end run of `dist/`, served over HTTP on `localhost` (the OPFS database needs a secure context), in
headless Chromium, which is the WebView's engine: the app starts, a product entered by hand appears in the
list, is opened, edited and deleted; and on each page, at 320×640, nothing scrolls. It is the only check of
the production entrypoint: the development server (`bun run watch`) runs the app on a database in memory,
and the tests never load the bundle. Before it, the floor check (`es-check` on `dist/*.js`, in the skill)
answers the one question about the bundle that has no user-visible symptom but a blank page.

### The emulator, on the target image

A pass before a release, by hand, on the AVD of the target API with the WebView up to date, on the reference
screens of the skill ("Supported screen sizes"). It checks what a change of the app can break and only Android
shows:

- the app starts: the splash, then the app, not `src/error.html`, in the light and the dark theme (the
  WebView follows the system's theme; the night splash);
- the system bars: the app bars sit below the top inset and the content above the navigation bar, on every
  page;
- the back button, on every page: with something to close it closes it, with the keyboard open it closes
  the keyboard, with nothing left it leaves the page, and from the home it leaves the app;
- the screens: on 320×712dp no page scrolls; on 320×533dp with the font at 200% and the keyboard open on
  each field, every page still reaches its button;
- a long press selects without delivering the tap that opens the product, and vibrates;
- the scanner: the camera's permission is asked once, a barcode is read, and the lookup on Open Food Facts
  answers from the WebView.

What is not on this list and concerns Android (a plugin's behaviour, the backup, a setting of the system) is a
doubt to settle once, listed under "Known gaps" in `AGENTS.md` until it is.

### The lowest Android

The same pass, on the AVD of `minSdkVersion`, after a change of `minSdkVersion`, of Capacitor or of a plugin,
and after the first release of each of those. Its result is written in the commit that made the change.

## Verified, and not

- Verified on 2026-10-28: `bunx es-check --module es2023 "dist/*.js"` passes on the bundle as built, and
  fails on the same bundle for an older edition, so the check bites. ES2023 is the last edition that WebView
  114 implements whole.
- Not yet: the production bundle in a browser, and CI, do not exist ("Known gaps" in `AGENTS.md`). Until
  they do, the production entrypoint runs only in the emulator, and the release pass in the emulator also
  does what the browser layer would.
- Not yet: the emulator pass as listed above has not been run as such. The passes of 2026-10-28 followed the
  previous procedure (API 29 on WebView 114 installed by hand, and API 37), and what they settled is already
  in the code and the docs.
