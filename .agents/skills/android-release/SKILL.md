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
- with that WebView updated through the Play Store to `minWebViewVersion` or later, signed in with a test
  account: the images ship an older one (74 on API 29).

API 29 is the lowest version that meets all three, hence `minSdkVersion` 29 in `android/variables.gradle`. A
change of `minSdkVersion`, of these rules or of `minWebViewVersion` (which can move the lowest version that
meets them) is checked in the emulator first, and `README.md` and this file change with it.

`compileSdkVersion` and `targetSdkVersion`, the Android Gradle Plugin and Gradle are those of the Android
template of the Capacitor release in use (`assets/android-template.tar.gz` in `@capacitor/cli`): API 37 for
Capacitor 9. They move only with an upgrade of Capacitor, checked in the emulator on the new target; an upgrade
not yet checked is listed under "Known gaps" in `AGENTS.md` until it is.

## Icons and splash screens

The launcher icons and the splash screens in `android/app/src/main/res` are generated from `assets/logo.svg`
by `@capacitor/assets`, on the app's surface color (`surface` in `scripts/palette.ts`):

```bash
bun run update-assets
```

The app has no dark theme, so the command deletes the `drawable-*night*` splashes the generator also makes
(from `assets/logo-dark.svg`), and puts `AndroidManifest.xml` back as it was, since the generator reformats
it. These files are the exception to `*.generated.*` naming: their tool fixes their names. After a change of
the logo or of the surface color, run the command and commit the images it changed.

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
4. is checked in the emulator on the lowest supported version and on the target;
5. is tagged in git (`v2026.10.0`).
