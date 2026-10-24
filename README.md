# Fridgy

Fridgy keeps track of the food in your fridge and of when it expires. It is an Android app (and a web app
during development) written in TypeScript, with a strictly functional, [Elm](https://elm-lang.org)-style
architecture.

> **Status:** work in progress. The main page (product list, adding and selecting products, expiration
> tracking) and the About page (version, links, licenses) run on the current architecture, with navigation
> between them and Android's back button.

## Stack

|                            |                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Language                   | TypeScript, with the Effect language service (`@effect/tsgo`)                                                              |
| Effects, services, streams | [Effect](https://effect.website) v4                                                                                        |
| View                       | [snabbdom](https://github.com/snabbdom/snabbdom) (virtual DOM, written in TSX) and [Tailwind CSS](https://tailwindcss.com) |
| Storage                    | SQLite (WebAssembly, in a worker)                                                                                          |
| Android packaging          | [Capacitor](https://capacitorjs.com)                                                                                       |
| Runtime, bundler, tests    | [Bun](https://bun.com), with [fast-check](https://fast-check.dev) for property tests                                       |
| Lint                       | [Biome](https://biomejs.dev), and [Oxlint](https://oxc.rs) for uses of deprecated APIs                                     |

## Getting started

Requirements: [Bun](https://bun.com) and, to build the Android app, Android Studio with an Android SDK.

```bash
bun install
```

It also regenerates the licenses shown on the About page
(`src/app/pages/about/services/licenses/generated/licenses.json`, from the production dependencies): commit
the file when it changes, with `bun.lock`.

### Run it in the browser

```bash
bun run watch
```

builds the development version into `dist/` (a database in memory, with sample products, new on every
reload), serves it, and rebuilds on every change under `src/`; open the address it prints. Editing a view or
the CSS swaps the view in place, keeping the application state; any other change reloads the page.

The first run creates `.env` from `.env.default`, where you can change the server host and port.

### Build the Android app

```bash
bun run build
```

builds the production version (SQLite storage) into `dist/`. Then copy it into the Android project and
open it in Android Studio:

```bash
bunx cap sync android
```

```bash
bunx cap open android
```

The app needs Android 10 (API 29) and Android System WebView 111: on an older WebView, Capacitor shows
`src/error.html` instead (`minWebViewVersion` in `capacitor.config.ts`).

An Android version is supported only if the app can be tested on it, in the Android emulator:

- on a Google Play image for x86_64: below API 28, Google's Play images are x86 only, at 32 bits;
- with Android System WebView as the WebView: Android 7 to 9 use Chrome instead;
- with that WebView updated through the Play Store to `minWebViewVersion` or later, signed in with a test
  account: the images ship an older one (74 on API 29).

API 29 is the lowest version that meets all three, hence `minSdkVersion` 29 in `android/variables.gradle`.

The launcher icons and the splash screens in `android/app/src/main/res` are generated from `assets/logo.svg`
by [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets), on the app's background color:

```bash
bunx @capacitor/assets@3.0.5 generate --android --iconBackgroundColor '#fef8e9' --splashBackgroundColor '#fef8e9'
```

The app has no dark theme, so the `drawable-*night*` splashes it also generates (from `assets/logo-dark.svg`)
are deleted, and its reformatting of `AndroidManifest.xml` is reverted.

The version is `YEAR.MONTH.N`, N counting the releases of the month from 0 (`2026.10.0`, `2026.10.1`,
`2026.11.0`), with no leading zeros, which `package.json` rejects. A release sets it only in `package.json`, which
the About page shows; `android/app/build.gradle` reads it as `versionName` and derives the `versionCode`,
`YEAR * 10000 + MONTH * 100 + N` (20261000), always higher than the last one, as the Play Store requires. Each
release is tagged in git (`v2026.10.0`).

## Development

| Command                   |                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------- |
| `bun run typecheck`       | Type-check the project                                                           |
| `bun run test`            | Run the tests                                                                    |
| `bun run lint`            | Lint, including the import rules described below, and warn about deprecated APIs |
| `bunx dprint fmt <files>` | Format the files you changed                                                     |

## Architecture

The whole app is one Elm-style program:

- a **single global state**, changed only by a pure `update(message)(state)`;
- **effects as data**: `update` returns _commands_ (data that the program's `runCommand` turns into Effects
  that may produce a message), and _subscriptions_
  turn the outside world (database changes, scrolling, a clock) into messages;
- a **pure view**: `makeModel` projects the state onto what the view needs, and the view turns that model
  into a virtual DOM.

The runtime is [`@fgaudo/effect-tea`](https://github.com/fgaudo/effect-tea), a library of its own. On top of
plain Elm, `update` rejects what does not apply, so a double tap is harmless; its testing tools check that the
view sends only what `update` accepts, and all of it; and pages are composed by declaring them. Its README
explains how.

What the app adds:

- **The root owns navigation**, a stack of pages. Pages ask for it through events (Elm's "OutMsg"), e.g. to
  open About or to be left.
- **An asynchronous operation is a state that waits for its completion**, which only that state accepts.
- **Bugs crash the app**; expected errors are typed and handled with Effect.

How the code is organized:

- **Pages** (`src/app/pages/`) are self-contained: each owns its messages, state, `update` and view, and
  imports nothing of another page. Biome enforces the boundaries by a file's role: imports go downwards only,
  and adapters are imported only by the layers and the entrypoints.
- **Parts.** A large page is split by concern into parts, each a program the page declares as a child, in a
  folder of its own.
- **Services and adapters.** A service is what a program needs from outside (the product list, scrolling,
  the back button): an Effect `Context.Service`, owned by the part, page or root that uses it, in its
  `services/` folder with the adapters (layers) that provide it. Services are never shared: two parts that both
  touch products each have their own.
- **Shared code moves up**: the entities (`Product`) to `src/domain/`, how things are done (the database's
  schema, how a product is written) to `src/infrastructure/`.
- **Environments** (production, development) exist only in `src/entrypoints/`, which pick what has
  alternatives: the database's engine and the shell (Capacitor on the phone, the browser's history in
  development, where the browser's back button acts as Android's).
- **Views** are TSX, rendered by snabbdom through a small bridge (`src/libs/tea-snabbdom/`, `src/libs/jsx/`).

See [`src/README.md`](src/README.md) for a map of the source tree and a suggested reading order.

## Tests

Tests sit next to the code they test (`*.test.ts`) and are mostly property tests: fast-check generates
thousands of states and messages and checks that the rules hold for all of them. Every branded type and
domain type has a `*.test_arbitrary.ts` file with its generators. Among others, the tests check that:

- `update` is deterministic and never throws;
- every message the real view can send, in any state, is accepted by `update`, and acts only once when
  sent twice (a double tap), unless it is meant to repeat;
- a stored product reads back as the same product;
- every storage adapter passes its service's contract on SQLite with the real migrations: what is written reads
  back as itself, deletions remove exactly what they should, Home's list is ordered and sees every write.

## Contributing

The rules of the codebase (architecture, conventions, what is still being migrated) are in
[`AGENTS.md`](AGENTS.md), written for both people and coding agents. Code, comments and documentation are
in English.
