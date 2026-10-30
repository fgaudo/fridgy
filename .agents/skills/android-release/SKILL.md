---
name: android-release
description: How to build Fridgy for Android with React Native, which Android versions it supports and why, how to regenerate the launcher icons and the icon font, how a release is checked in the emulator, and how to version, tag and release. Use when building the Android app, upgrading React Native or a native module, changing minSdkVersion, or making a release.
---

# Android and releases

What is checked where, and why, is [`docs/testing.md`](../../../docs/testing.md); this skill holds the
commands.

## Build

The Android project is `android/`, React Native's own, whose Gradle plugin bundles the JavaScript of
`src/entrypoints/native.ts` with Metro and compiles it to Hermes bytecode. Every variant carries its bundle
(`debuggableVariants = []` in `android/app/build.gradle`): no build needs Metro's server.

```bash
cd android && ./gradlew assembleDebug
```

```bash
cd android && ./gradlew bundleRelease
```

The debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`, signed with React Native's public debug key;
the release, an unsigned AAB in `android/app/build/outputs/bundle/release/`, minified by R8. Gradle runs on
Android Studio's JDK (`JAVA_HOME` set to its `jbr`) and installs the NDK the native modules need on the first build.
`-PreactNativeArchitectures=x86_64` builds for the emulator only, in a fraction of the time. The native modules
(op-sqlite, the safe area, the SVG of Home's rings) are linked from `node_modules` by React Native's CLI, which Gradle runs from the
repository's root. The app's own, the camera that reads barcodes (CameraX and zxing-cpp, in
`android/app/src/main/java/net/gaudo/fridgy/barcodecamera`, registered in `MainApplication.kt`), is written on the
interfaces that React Native's codegen makes from the specs in `src/infrastructure/barcode-camera`
(`codegenConfig` in `package.json`) on every build. After a new spec file, delete `android/app/.cxx`: CMake keeps
the configuration it made before the generated code existed, and the app then starts without the module
(`TurboModuleRegistry.getEnforcing(...): 'BarcodeCamera' could not be found`).

The JavaScript alone, without Android's toolchain, is checked by `bun run bundle` (Metro's bundle into `out/`) and
`hermesc` (`node_modules/hermes-compiler/hermesc/<platform>/hermesc -emit-binary -O -out out/index.android.hbc
out/index.android.bundle`), as CI does: a module Metro cannot resolve, or a syntax Hermes rejects, fails there.

On Windows, a path longer than 260 characters breaks the native build (`ninja: Filename longer than 260
characters`): the C++ of a module is compiled under `android/app/.cxx`, with the module's own path in the object's.
Keep the checkout's path short (a worktree under `.claude/worktrees/` is too deep for `react-native-safe-area-context`).

## Supported Android versions

The app needs Android 10 (API 29). An Android version is supported only if the app can be tested on it, in the
Android emulator, on a Google Play image for x86_64: below API 28, Google's Play images are x86 only, at 32 bits.
The web build needed Android System WebView too, which Android 7 to 9 lack: API 29 was the lowest version that met
both. React Native runs from API 24, so `minSdkVersion` 29 (`android/build.gradle`) is now the app's choice, not
the platform's: lowering it is a decision for the author, checked in the emulator first, with `README.md` and this
file.

`compileSdkVersion` and `targetSdkVersion` are 37, `buildToolsVersion` and the NDK those of React Native's template
for the release in use (`@react-native-community/template`, its `android/build.gradle`). They move with an upgrade
of React Native, checked in the emulator on the new target; an upgrade not yet checked is listed under "Known gaps"
in `AGENTS.md` until it is. React Native, its CLI, its Babel preset, its Metro config and the template move
together, at one version.

## Supported screen sizes

The pages are laid out for a reference screen **320dp wide, with 640dp between the system bars** (the status bar
and the navigation bar, which the app draws under), and every page fits it without scrolling. The width is
Android's "normal" bucket and the narrowest phone still made; the height is that of the smallest phone frame in
common use (Figma's "Android Small", 360×640dp), no phone narrower than that frame being taller than it.
No height below the reference is guaranteed: the keyboard, the user's "Font size" and "Display size" settings (up
to 200% of text) and split-screen shorten any phone's viewport, so a page's column scrolls when the screen is
shorter than its content (the steps of `add-products`, the page that edits a product), while the page's main
action stays docked under it, in sight ("Add" of the second step, "Save"). The manifest declares the width
(`<supports-screens android:requiresSmallestWidthDp="320" />`), which only the Play Store reads, to hide the app
from narrower devices: an APK installs anywhere, and today no phone is narrower. The sizes move only as the
versions above do: checked in the emulator first, with `README.md`, `AGENTS.md`, the `views` skill and this file.

In the emulator, the reference screens are a device profile of 960×2136 px at 480 dpi (320×712dp, 640dp between
the status bar and the three-button navigation bar), where no page scrolls, and the Nexus S image (480×800 hdpi,
320×533dp), with the font at 200% in the system settings and the keyboard open on each field, where every page
still reaches its button. Any AVD gives those screens with `adb shell wm size 960x2136` and `wm density 480`,
or `wm size 480x800` and `wm density 240` (`wm size reset` and `wm density reset` after), and the font with
`settings put system font_scale 2.0`. The three buttons:
`adb shell cmd overlay enable-exclusive --category com.android.internal.systemui.navbar.threebutton`. The 640dp
need a status bar of 24dp: on a profile whose display has a cutout (the Pixel 6), it is 38dp, which `wm size`
does not change, and 626dp remain (seen on 2026-10-29 on API 37). A page that scrolls there by less than 14dp
still fits the reference.

## The emulator

The pass of `docs/testing.md` ("The emulator, on the target image") runs on the AVD of `targetSdkVersion`'s Google
Play image, with the release build signed with the debug key, which the emulator installs:

```bash
zipalign -f -p 4 app-release-unsigned.apk aligned.apk
```

```bash
apksigner sign --ks android/app/debug.keystore --ks-pass pass:android --key-pass pass:android --out signed.apk aligned.apk
```

(both in the SDK's `build-tools/<version>/`, after `./gradlew assembleRelease`; `apksigner` runs on `JAVA_HOME`'s
Java). A debug build runs the same bundle, but starts in about five seconds and draws React Native's red screen on
an error; on Android 17 it also asks for "nearby devices", looking for Metro's server, which can be refused. The
lowest version (`minSdkVersion`'s image) is checked only after a change of `minSdkVersion`, of React Native or of a
native module.

Before judging a motion, switch Android's renderer to Vulkan, once after each boot of the emulator, then restart the
app:

```bash
adb shell setprop debug.hwui.renderer skiavk
```

The image draws with OpenGL (`skiagl`), which the emulator translates call by call for the host's GPU: every app,
Android's Settings too, then runs at about 18 ms a frame, under 60 fps. On Vulkan, which recent phones use, the
motions run at 60 fps (`docs/motion.md`, "The frames"). The property is lost at the next boot: a Google Play image
has no root to make it last. `adb shell dumpsys gfxinfo net.gaudo.fridgy` gives the frame times (`reset` before).

The pass, on both reference screens of "Supported screen sizes":

- the app starts: the splash on the surface's color, then Home, in the light and the dark theme
  (`adb shell cmd uimode night yes`), the system bars' icons readable on both; a change of the theme while a page is
  open redraws it in the other scheme, on the same page;
- the system bars: the app bars sit below the top inset and the content above the navigation bar, on every
  page;
- the back button, on every page: with something to close it closes it, with the keyboard open it closes
  the keyboard, with nothing left it leaves the page, and from Home it leaves the app;
- the screens: on 320×712dp no page scrolls; on 320×533dp with the font at 200% and the keyboard open on
  each field, every page still reaches its button;
- each page and each state a change touched: Home's list and its colors of freshness, the selection and the
  deletion with "Undo", both steps of the page that adds products, the page that edits a product, About;
- a long press selects without delivering the tap that opens the product, and vibrates;
- the scanner: its permission is asked on the first opening, a refusal says "Camera not available. Type the name",
  and a code held to the camera (the emulator's back camera is the host's webcam with
  `emulator -avd <avd> -camera-back webcam0`; a code shown on a phone's screen reads) closes it and names the
  product.

The app installs over a debug build only after `adb uninstall net.gaudo.fridgy`: the two are signed with the same
key, but an install over an older schema fails on the first read, so start from a clean state anyway. The JavaScript's
log is `adb logcat -s ReactNativeJS` (the entrypoint logs from `Info` up). A vibration's delivery:
`adb shell dumpsys vibrator_manager` lists each one with its usage and whether the system ignored it. The backup:
`adb shell bmgr enable true`, `bmgr transport com.android.localtransport/.LocalTransport`,
`bmgr backupnow net.gaudo.fridgy`, then uninstall and reinstall: `restoreAtInstall` is to bring `databases/`, with
the products, back (verified for the web build's `app_webview` on 2026-10-28, not yet for op-sqlite's database).

## Icons, splash and the icon font

The launcher icons in `android/app/src/main/res` are generated from `assets/logo.svg` by `@capacitor/assets` (a
generator of plain Android resources, run with `bunx`), on the app's surface color (`surface` in
`scripts/palette.ts`):

```bash
bun run update-assets
```

The command puts `AndroidManifest.xml` back as it was, since the generator reformats it, and removes the splash
images it also writes, which the app does not draw. These files are the exception to `*.generated.*` naming: their
tool fixes their names. Android draws the splash itself, with the launcher icon, on the surface's color: from
Android 12 on `windowSplashScreenBackground` (`values-v31/styles.xml`), before it on the window's background
(`values/styles.xml`). The same command writes that color, both surfaces, into `values/splash.generated.xml` and
`values-night/splash.generated.xml`. After a change of a logo or of a surface color, run the command and commit the
files it changed.

The icon font, `android/app/src/main/assets/fonts/MaterialSymbolsRounded.ttf`, is not committed: `bun install`
writes it (`bun run update-icons`), decompressing the package's WOFF2, which Android cannot read. It is 15 MB,
every icon: a view may name any.

## Licenses

The About page lists what the release ships: the packages of Metro's bundle (`bun run update-licenses`, which CI
checks), and the Android libraries, as AboutLibraries' Gradle plugin exports them from their POMs, with what no POM
describes, listed by hand in `nativeEntries` (`scripts/licenses.ts`): the C and C++ compiled into the native libraries
(React Native's, Hermes', Fresco's, op-sqlite's SQLite, the NDK's libc++) and the modules built from sources
(`bun run update-android-licenses`, which needs Gradle). Both fail on a license outside `ALLOWED`, the ones an AGPL
app may ship with: a new one is the author's decision, never a line added to pass. After an upgrade of React Native,
of Fresco, of op-sqlite or of the NDK, `nativeEntries` is read again, as its comment says.

Fresco depends on Bolts' tasks 1.4.0, under BSD with Facebook's PATENTS, which Meta relicensed under MIT in 2018
without publishing a release ([meta/fresco#2257](https://github.com/meta/fresco/issues/2257)). `android/bolts-tasks` is
that MIT code, which entered the repository as the commit of the relicensing has it (`provenance.json` holds the
commit and each file's git blob id there; the license allows changing it, and a change shows in the history), built
as a module of the app; `android/app/build.gradle` puts it in
the place of `com.parse.bolts:bolts-tasks` for every library that asks for it. Should Fresco drop Bolts, or a release
of it under MIT appear, the module goes.

## Version and release

The version is `YEAR.MONTH.N`, N counting the releases of the month from 0 (`2026.10.0`, `2026.10.1`,
`2026.11.0`), with no leading zeros, which `package.json` rejects. A release:

1. sets the version only in `package.json`, which the About page shows; `android/app/build.gradle` reads it as
   `versionName` and derives the `versionCode`, `YEAR * 10000 + MONTH * 100 + N` (20261000), always higher
   than the last one, as the Play Store requires;
2. regenerates the licenses shown on the About page, `bun run update-licenses` and `bun run update-android-licenses`
   ("Licenses" below), and commits the files when they change;
3. runs `bun run typecheck`, `bun run test`, `bun run lint` and the bundle check; CI
   (`.github/workflows/checks.yml`) runs the same checks on the push;
4. runs the emulator pass above on the target image, on the release build; every item under "Known gaps" that the
   emulator can settle is settled then, and removed;
5. is built (`./gradlew bundleRelease`) and uploaded to the Play Console as an AAB signed with the upload key of the
   previous releases (Play App Signing holds the app's key; `build.gradle` signs no release), with the AAB's size
   noted, and the console brought up to date with it: the store listing (screenshots and description of the app as
   it is, the "What's new" text), the Data safety form (the developer collects nothing; the camera, for the scanner,
   once it is drawn again; a scanned barcode is sent to Open Food Facts), the privacy policy's URL
   (`https://github.com/fgaudo/fridgy/blob/main/PRIVACY.md`, the one About links) and no link to the old docs site
   (`fgaudo.github.io/fridgy`, gone);
6. is tagged in git (`v2026.10.0`).

### The first release of this app

It replaces 1.0.8 (August 2025, another codebase: SvelteKit, Capacitor 7, minSdkVersion 23), the one on the
Play Store, as an update: its `versionCode` over 1.0.8's 10. Decided, and to be done before it:

- **The products of 1.0.8 are not carried over.** 1.0.8 kept them in a native SQLite database (`fridgy.db`,
  written by its own `SQLiteOpenHelper`), which nothing in this app reads, and it had `allowBackup="false"`,
  so no backup brings them back either. Decided on 2026-10-28: no import; the "What's new" text says that the
  products are to be entered again.
- `minSdkVersion` goes from 23 to 29 ("Supported Android versions"): phones on Android 6 to 9 keep 1.0.8 and
  get no update, which the Play Console reports.
- **It ships on React Native**, not on the WebView the app was first written for (decided on 2026-10-29). The
  items of "Known gaps" in `AGENTS.md` that concern the move (motion) are settled or accepted by
  the author before it.

Remove this section once the release is out.
