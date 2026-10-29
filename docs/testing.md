# Design: how the app is tested

Decided on 2026-10-28, for the WebView; redrawn on 2026-10-29 for React Native. This document says which checks
the app has, what each one covers and what none of them does, and why a release is checked where it is. How a test
is written is in [`AGENTS.md`](../AGENTS.md) ("Tests") and in the "Guide" of
`node_modules/@fgaudo/effect-tea/README.md`; the commands, and how the emulator is set up, are in the
`android-release` skill. What this design asks for and does not exist yet is listed under "Known gaps" in
`AGENTS.md`, not here.

## Decisions

- **Three layers, each for what the others cannot reach.** The tests on every change cover the logic and what the
  views send; the bundle check covers what Metro and Hermes make of the code; one pass in the emulator covers what
  is drawn and what only Android has. A check that a lower layer can make is never made in a higher one, which
  costs more and tells less.
- **The views are tested as functions, not rendered.** A view is a pure function of its model, so its test draws
  it and calls every callback it holds (`messagesSentBy`), checking that it sends only what `update` accepts, and
  all of it. Nothing renders it: `bun test` cannot load React Native, whose modules are Flow, and the preload
  replaces them with their names. What a view looks like is the emulator's to show.
- **The bundle is checked without Android's toolchain.** Gradle compiles the JavaScript in two steps, Metro's bundle
  and Hermes' bytecode of it, and either can fail on code the typecheck accepts: a module Metro cannot resolve, a
  syntax Hermes rejects (`import.meta`, which `babel.config.cjs` replaces). CI makes both steps on every push, in a
  few seconds, without the NDK.
- **The lowest Android is tested only when what differs between Android versions changes.** From Android 10 to the
  target, what differs is the system: the insets, the back dispatcher, the permissions, the backup. Those change
  with `minSdkVersion`, with React Native and with its native modules, not with the app's pages. So a release is
  checked on the target image; the lowest image is checked after a change of one of those three, and the result
  stays true until the next.
- **A doubt about the platform is settled once.** Whether a vibration feels like the constant it stands for,
  whether a backup restores the database: a fact of Android, checked in one emulator pass, written down (in the
  design that depends on it, or in the code's comment) and taken off "Known gaps". What the emulator pass repeats
  at every release is only what a change of the app can break.

## The layers

| Layer                                   | When                      | Covers                                                                                                                                                                                        | Does not cover                                                                            |
| --------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| The tests (`bun test`, typecheck, lint) | every change              | every program's transitions, commands and subscriptions; what every view sends; every service through its contract, on each adapter; the domain; the root as a user over a database in memory | the entrypoint, the native modules, op-sqlite, the bundle, a screen                       |
| The bundle check (`bun run bundle`)     | every push (CI)           | that Metro resolves every module from the entrypoint, that Hermes compiles the result, and that the About page lists the bundle's packages, each under a license the app may ship with        | running it                                                                                |
| The emulator, on the target image       | before a release, by hand | the release build as a user runs it: what is drawn, on the reference screens and at 200%, and what only Android has (the skill's list)                                                        | the lowest Android, unless `minSdkVersion`, React Native or a native module changed since |

### The tests on every change

What `AGENTS.md` "Tests" describes. They are the layer that grows with the app: a behaviour is specified here
first, and the layers above only confirm that the bundle and the platform carry it.

### The bundle check

`bun run bundle` writes Metro's bundle of `src/entrypoints/native.ts` into `out/`, and CI compiles it with the
`hermesc` that React Native ships. It runs nothing: a module that fails when it is loaded (a global Hermes lacks,
read at the top of a module) passes it, and shows on the emulator.

### The emulator, on the target image

A pass before a release, by hand, on the AVD of the target API, on the reference screens, with the release build
(the `android-release` skill says how to build it and sign it with the debug key for the emulator: a debug build
runs the same bundle, but starts slower and draws React Native's red screen on an error). Its checklist is in the
skill ("The emulator"), and holds what a change of the app can break: the pages, the motions once they exist, the
colors of the states, the failure snackbars, the start and the splash, the system bars, the back button, the
keyboard and the font at 200%, the long press. What is not on it and concerns Android (a module's behaviour, the
backup, a setting of the system) is a doubt to settle once, listed under "Known gaps" in `AGENTS.md` until it is.

### The lowest Android

The same pass, on the AVD of `minSdkVersion`, after a change of `minSdkVersion`, of React Native or of a native
module, and after the first release of each of those. Its result is written in the commit that made the change.

## Verified, and not

- Verified on 2026-10-29, in the emulator on API 37: the debug build and the release (minified, signed with the
  debug key). Home, the selection and the deletion with "Undo", both steps of the page that adds products, the
  page that edits a product, About, Android's back button on each page and out of the app. The pass found two
  bugs, fixed the same day: the vibrations needed `VIBRATE`, which Capacitor's plugin had declared, and a refused
  vibration crashed the app; the FAB stood under the navigation bar.
- Not yet: the lowest Android (API 29), the reference screens, the font at 200%, the failure snackbars (the
  storage on the phone does not fail on demand, as the web build's development server could).
