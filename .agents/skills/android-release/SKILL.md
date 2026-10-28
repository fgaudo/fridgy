---
name: android-release
description: How to build Fridgy for Android, which Android versions it supports and why, how the WebView floor is checked, how to regenerate the launcher icons and splash screens, how a release is checked in the emulator, and how to version, tag and release. Use when building the Android app, upgrading Capacitor, changing minSdkVersion or minWebViewVersion, or making a release.
---

# Android and releases

What is checked where, and why, is [`docs/testing.md`](../../../docs/testing.md); this skill holds the
commands.

## Build

```bash
bun run build
```

builds the production version (SQLite storage in a worker) into `dist/`. Then copy it into the Android project
and open it in Android Studio:

```bash
bunx cap sync android
```

```bash
bunx cap open android
```

`bunx cap sync` rewrites `android/app/capacitor.build.gradle` and `android/capacitor.settings.gradle`: commit
them as it leaves them.

## Supported Android versions

The app needs Android 10 (API 29) and Android System WebView 114: on an older WebView, Capacitor shows
`src/error.html` instead (`minWebViewVersion` in `capacitor.config.ts`).

An Android version is supported only if the app can be tested on it, in the Android emulator:

- on a Google Play image for x86_64: below API 28, Google's Play images are x86 only, at 32 bits;
- with Android System WebView as the WebView: Android 7 to 9 use Chrome instead.

API 29 is the lowest version that meets both, hence `minSdkVersion` 29 in `android/variables.gradle`. A
change of `minSdkVersion` or of these rules is checked in the emulator first, and `README.md` and this file
change with it.

`minWebViewVersion` is the lowest WebView with everything the app uses; the comment on it in
`capacitor.config.ts` names what needs the highest version. The app is never run on that version
(`docs/testing.md` says why): the floor is checked on the bundle, after a build,

```bash
bunx es-check --module es2023 "dist/*.js"
```

which fails on a syntax that ES2023, the last edition WebView 114 implements whole, does not have. The bundle
is not transpiled (`Bun.build`, the `ESNext` target), so every syntax in it counts, Tailwind's and Effect's
included, and an upgrade of a dependency can raise what the app needs without a change in `src/`: run the
check before a release and after an upgrade of Capacitor, Effect, Tailwind or `@effect/wa-sqlite`. The APIs
and the CSS features the comment lists have no check: when `minWebViewVersion` moves, re-derive the list from
what the app uses, on caniuse.

`compileSdkVersion` and `targetSdkVersion`, the Android Gradle Plugin and Gradle are those of the Android
template of the Capacitor release in use (`assets/android-template.tar.gz` in `@capacitor/cli`): API 37 for
Capacitor 9. They move only with an upgrade of Capacitor, checked in the emulator on the new target; an upgrade
not yet checked is listed under "Known gaps" in `AGENTS.md` until it is.

## Supported screen sizes

The pages are laid out for a reference screen **320dp wide, with 640dp between the system bars** (the status bar
and the navigation bar, which the app draws under), and every page fits it without scrolling. The width is
Android's "normal" bucket and the narrowest phone still made; the height is that of the smallest phone frame in
common use (Figma's "Android Small", 360×640dp), no phone narrower than that frame being taller than it.
No height below the reference is guaranteed: the keyboard, the user's "Font size" and "Display size" settings (up
to 200% of text) and split-screen shorten any phone's viewport, so a page's column scrolls when the screen is
shorter than its content (the steps of `add-products`, the page that edits a product) instead of docking anything
out of reach. The manifest declares the width (`<supports-screens android:requiresSmallestWidthDp="320" />`),
which only the Play Store reads, to hide the app from narrower devices: an APK installs anywhere, and today no
phone is narrower. The sizes move only as the versions above do: checked in the emulator first, with
`README.md`, `AGENTS.md`, the `views` skill and this file.

In the emulator, the reference screens are a device profile of 960×2136 px at 480 dpi (320×712dp, 640dp between
the status bar and the three-button navigation bar), where no page scrolls, and the Nexus S image (480×800 hdpi,
320×533dp), with the font at 200% in the system settings and the keyboard open on each field, where every page
still reaches its button. Any AVD gives those screens with `adb shell wm size 960x2136` and `wm density 480`,
or `wm size 480x800` and `wm density 240` (`wm size reset` and `wm density reset` after), and the font with
`settings put system font_scale 2.0`. In a browser, the pane at 320×640 and 320×533 stands in, with no bars.

## The emulator

The pass of `docs/testing.md` ("The emulator, on the target image") runs on the AVD of `targetSdkVersion`'s
Google Play image, with the image's WebView brought up to date by the Play Store, as on a phone:
`adb shell dumpsys webviewupdate` shows the current package and its version. The lowest version
(`minSdkVersion`'s image, the same way) is checked only after a change of `minSdkVersion`, of Capacitor or of a
plugin.

Install the app from a clean state (`adb shell pm clear net.gaudo.fridgy`): an install over an older schema
fails on the first read. The dark theme: `adb shell cmd uimode night yes`. A vibration's delivery:
`adb shell dumpsys vibrator_manager` lists each one with its usage and whether the system ignored it. The
backup: `adb shell bmgr enable true`, `bmgr transport com.android.localtransport/.LocalTransport`,
`bmgr backupnow net.gaudo.fridgy`, then uninstall and reinstall.

## Icons and splash screens

The launcher icons and the splash screens in `android/app/src/main/res` are generated from `assets/logo.svg`
by `@capacitor/assets`, on the app's surface color (`surface` in `scripts/palette.ts`); the splashes of the dark
theme (`drawable-*night*`) from `assets/logo-dark.svg`, on the dark scheme's surface:

```bash
bun run update-assets
```

The command puts `AndroidManifest.xml` back as it was, since the generator reformats it. These files are the
exception to `*.generated.*` naming: their tool fixes their names. After a change of a logo or of a surface
color, run the command and commit the images it changed.

## Version and release

The version is `YEAR.MONTH.N`, N counting the releases of the month from 0 (`2026.10.0`, `2026.10.1`,
`2026.11.0`), with no leading zeros, which `package.json` rejects. A release:

1. sets the version only in `package.json`, which the About page shows; `android/app/build.gradle` reads it as
   `versionName` and derives the `versionCode`, `YEAR * 10000 + MONTH * 100 + N` (20261000), always higher
   than the last one, as the Play Store requires;
2. runs `bun install`, which regenerates the licenses shown on the About page
   (`src/app/children/about/services/licenses/licenses.generated.json`), and commits the file with `bun.lock`
   when it changes;
3. runs `bun run typecheck`, `bun run test` and `bun run lint`, builds and syncs as above, and runs the floor
   check on `dist/`;
4. runs the production bundle in a browser as `docs/testing.md` says, once that check exists ("Known gaps" in
   `AGENTS.md`), and the emulator pass above on the target image; every item under "Known gaps" that the
   emulator can settle is settled then, and removed;
5. is uploaded to the Play Console as an AAB signed with the upload key of the previous releases (Play App
   Signing holds the app's key; `build.gradle` has no signing config), with the AAB's size noted (`dist/` is
   1.4 MB), and the console brought up to date with it: the store listing (screenshots
   and description of the app as it is, the "What's new" text), the Data safety form (the developer collects
   nothing; the camera, for the scanner; a scanned barcode is sent to Open Food Facts), the privacy policy's
   URL (`https://github.com/fgaudo/fridgy/blob/main/PRIVACY.md`, the one About links) and no link to the old
   docs site (`fgaudo.github.io/fridgy`, gone);
6. is tagged in git (`v2026.10.0`).

### The first release of this app, 2026.10.0

It replaces 1.0.8 (August 2025, another codebase: SvelteKit, Capacitor 7, minSdkVersion 23), the one on the
Play Store, as an update: `versionCode` 20261000 over its 10. Decided, and to be done before it:

- **The products of 1.0.8 are not carried over.** 1.0.8 kept them in a native SQLite database (`fridgy.db`,
  written by its own `SQLiteOpenHelper`), which nothing in this app reads, and it had `allowBackup="false"`,
  so no backup brings them back either. Decided on 2026-10-28: no import; the "What's new" text says that the
  products are to be entered again.
- `minSdkVersion` goes from 23 to 29 ("Supported Android versions"): phones on Android 6 to 9 keep 1.0.8 and
  get no update, which the Play Console reports.
- The tree has no `LICENSE` file, though About says AGPL-3.0-or-later and 1.0.8 had one (`git show
  1.0.8:LICENSE`): restore it, and set `license` in `package.json`.
- `app_name` in `android/app/src/main/res/values/strings.xml` and `appName` in `capacitor.config.ts` say
  `fridgy`; 1.0.8 showed `Fridgy` in the launcher.

Remove this section once the release is out.
