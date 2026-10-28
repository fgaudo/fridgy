---
name: android-release
description: How to build Fridgy for Android, which Android versions it supports and why, how to regenerate the launcher icons and splash screens, and how to version, tag and release. Use when building the Android app, upgrading Capacitor, changing minSdkVersion or minWebViewVersion, or making a release.
---

# Android and releases

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

Only what can be tested is supported. The app needs Android 10 (API 29) and Android System WebView 114: on an
older WebView, Capacitor shows `src/error.html` instead (`minWebViewVersion` in `capacitor.config.ts`).

An Android version is supported only if the app can be tested on it, in the Android emulator:

- on a Google Play image for x86_64: below API 28, Google's Play images are x86 only, at 32 bits;
- with Android System WebView as the WebView: Android 7 to 9 use Chrome instead;
- with that WebView at exactly `minWebViewVersion`, installed by hand as below: the images ship an older one
  (74 on API 29), and the Play Store would install the latest, which proves nothing about the lowest.

API 29 is the lowest version that meets all three, hence `minSdkVersion` 29 in `android/variables.gradle`. A
change of `minSdkVersion`, of these rules or of `minWebViewVersion` (which can move the lowest version that
meets them) is checked in the emulator first, and `README.md` and this file change with it.

`minWebViewVersion` is the lowest WebView with everything the app uses; the comment on it in
`capacitor.config.ts` names what needs the highest version. The bundle is not transpiled (`Bun.build`, the
`ESNext` target), so every syntax, API and CSS feature in it counts, Tailwind's and Effect's included, and an
upgrade of a dependency can raise what the app needs without a change in `src/`. Nothing checks this
statically: the check is the emulator on that exact WebView, before a release and after an upgrade of
Capacitor, Effect, Tailwind or `@effect/wa-sqlite`.

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
phone is narrower. Every page is checked before a release, in the emulator: on a device profile of 960×2136 px at
480 dpi (320×712dp, 640dp between the status bar and the three-button navigation bar), where no page scrolls, and
on the Nexus S image (480×800 hdpi, 320×533dp), with the font at 200% in the system settings and with the keyboard
open on each field, where every page still reaches its button. Any AVD gives those screens with `adb shell wm size
960x2136` and `wm density 480`, or `wm size 480x800` and `wm density 240` (`wm size reset` and `wm density reset`
after), and the font with `settings put system font_scale 2.0`. In a browser, the pane at 320×640 and 320×533
stands in, with no bars. The sizes move only as the versions above do: checked in the emulator first, with `README.md`, `AGENTS.md`, the
`views` skill and this file.

### The emulator on the lowest WebView

1. Download Android System WebView `minWebViewVersion` (e.g. `114.0.5735.196`) from APKMirror,
   `apkmirror.com/apk/google-inc/android-system-webview/`: the APK variant for "x86 + x86_64", "Android 7.0+",
   signature `1f38`. It is the standalone WebView, which Android 10 and later run too; the "Android 10+"
   variants are the Trichrome ones, which need a Trichrome Library APK of the same version and have no x86_64
   build.
2. Install it on the emulator, over the image's own:

   ```bash
   adb install -r android-system-webview.apk
   ```

   `adb shell dumpsys webviewupdate` must then show `com.google.android.webview` with that version as the
   current package. Nothing else is selected: a Play image has no other WebView provider.
3. Do not sign the emulator into a Google account: the Play Store would update the WebView to the latest.
   If it did, `adb uninstall com.google.android.webview` removes the update and puts the image's own back.
4. Run the app: it must start (not `src/error.html`), and what the comment on `minWebViewVersion` lists must
   work: the database, the shadows and the scrim, the list snapping back to the top after a scroll.

`compileSdkVersion` and `targetSdkVersion`, the Android Gradle Plugin and Gradle are those of the Android
template of the Capacitor release in use (`assets/android-template.tar.gz` in `@capacitor/cli`): API 37 for
Capacitor 9. They move only with an upgrade of Capacitor, checked in the emulator on the new target; an upgrade
not yet checked is listed under "Known gaps" in `AGENTS.md` until it is.

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
3. runs `bun run typecheck`, `bun run test` and `bun run lint`, then builds and syncs as above;
4. is checked in the emulator on the lowest supported version and on the target, and every item under "Known
   gaps" in `AGENTS.md` that the emulator or a phone can settle is checked then;
5. is uploaded to the Play Console as an AAB signed with the upload key of the previous releases (Play App
   Signing holds the app's key; `build.gradle` has no signing config), with the AAB's size noted (`dist/` is
   38 MB, mostly the Noto fonts), and the console brought up to date with it: the store listing (screenshots
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
