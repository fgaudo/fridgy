# Fridgy

Fridgy keeps track of the food in your fridge and of when it expires. It is an Android app (and a web app
during development) written in TypeScript, with a strictly functional, [Elm](https://elm-lang.org)-style
architecture.

> **Status:** work in progress. The main page (product list, selecting products, expiration tracking), the page
> that adds products one after another, in two steps (the name is typed or read from a barcode in the scanner's
> dialog, which looks the product up on [Open Food Facts](https://openfoodfacts.org) and caches the answer on the
> phone, and the product is added as it is or goes on to its expiration date, typed as digits in the order of
> day, month and year the user keeps, from which the user picks the day they meant; the product added then flies
> into a fridge), the page that edits a product (opened with a tap on it, its name and its expiration date, typed
> on the same keypad) and the About page (version, links, licenses) run on the current architecture, with
> navigation between them and Android's back button. What is
> still missing is listed under "Known gaps" in [`AGENTS.md`](AGENTS.md).

**Privacy:** scanning a barcode sends the barcode, and the phone's IP address, to Open Food Facts; nothing else
leaves the phone. The whole of it is in [`PRIVACY.md`](PRIVACY.md), the policy the store listing links to.

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
(`src/app/children/about/services/licenses/licenses.generated.json`, from the production dependencies): commit
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

builds the production version (SQLite storage) into `dist/`. Then copy it into the Android project and open it
in Android Studio:

```bash
bunx cap sync android
```

```bash
bunx cap open android
```

The app needs Android 10 (API 29) and Android System WebView 114: on an older WebView, Capacitor shows
`src/error.html` instead. Its pages are laid out for a screen 320dp wide with 640dp between the system bars, which every
page fits without scrolling: a page scrolls when the screen is shorter than it, as the keyboard or a large font
makes it. Why these versions, how the icons and splash screens are generated and how a release
is versioned and tagged is in [`.agents/skills/android-release/SKILL.md`](.agents/skills/android-release/SKILL.md).

## Development

| Command                   |                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `bun run typecheck`       | Type-check the project                                                                              |
| `bun run test`            | Run the tests                                                                                       |
| `bun run lint`            | Lint, including the import boundaries and the order of imports, and warn about deprecated APIs      |
| `bunx dprint fmt <files>` | Format the files you changed                                                                        |
| `bun run update-palette`  | Regenerate `src/palette.generated.css`, the colors, from the key colors in `scripts/palette.ts`     |
| `bun run update-assets`   | Regenerate the Android launcher icons and splash screens from `assets/logo.svg` and `logo-dark.svg` |

A file named `*.generated.*` is written by a command and never edited by hand: change what it is made from and
run the command again.

## Architecture

The whole app is one Elm-style program:

- a **single global state**, changed only by a pure `update(message)(state)`;
- **effects as data**: `update` returns _commands_ (data that the program's `runCommand` turns into Effects
  that may produce a message), and _subscriptions_ turn the outside world (database changes, scrolling, a
  clock) into messages;
- a **pure view**: `makeModel` projects the state onto what the view needs, and the view turns that model
  into a virtual DOM.

The runtime is [`@fgaudo/effect-tea`](https://github.com/fgaudo/effect-tea), a library of its own. On top of
plain Elm, `update` rejects what does not apply, so a double tap is harmless; its testing tools check that the
view sends only what `update` accepts, and all of it; and pages are composed by declaring them. Its README
explains how.

What the app adds:

- **The root owns navigation**, a stack of pages. Pages ask for it through events (Elm's "OutMsg"), e.g. to
  open About, the page that adds products or the one that edits a product, or to be left. A page that cannot
  start the same way every time starts from flags: the page that edits a product, from the product tapped.
- **An asynchronous operation is a state that waits for its completion**, which only that state accepts.
- **Bugs crash the app**; expected errors are typed and handled with Effect.

How the code is organized:

- **A tree of programs** (`src/app/children/`), all of the same shape: the root, its pages and a large page's
  children are each a folder with a program, a view, a layer, its services and its own `children/`. Each
  imports nothing of a sibling; Biome enforces the boundaries.
- **Services and adapters.** A service is what a program needs from outside (the product list, scrolling, the
  back button), owned by the program that uses it, with the adapters that provide it. Two programs that both
  touch products each have their own.
- **Shared code moves up**: the entities (`Product`) to `src/domain/`, how things are done (the database's
  schema, how a product is written) to `src/infrastructure/`, a whole program two programs use to the
  `programs/` of their common parent (none yet).
- **Environments** (production, development) exist only in `src/entrypoints/`, which pick what has
  alternatives: the database's engine, the HTTP client and the platform's back button.
- **Views** are TSX, rendered by snabbdom through a small bridge (`src/libs/tea-snabbdom/`, `src/libs/jsx/`),
  following Material 3.

See [`src/README.md`](src/README.md) for a map of the source tree, a suggested reading order and the import
boundaries.

## Tests

Tests sit next to the code they test (`*.test.ts`) and are mostly property tests: fast-check generates
thousands of states and messages and checks that the rules hold for all of them. Every branded type and
domain type has a `*.test_arbitrary.ts` file with its generators. Among others, the tests check that:

- `update` is deterministic, and throws only on a message that cannot arrive (an operation's completion
  outside it), which is a bug that ends the run;
- every message the real view can send, in any state, is accepted by `update`, and acts only once when
  sent twice (a double tap), unless it is meant to repeat;
- a stored product reads back as the same product;
- every storage adapter passes its service's contract on SQLite with the real migrations: what is written reads
  back as itself, deletions remove exactly what they should and an undone one puts its products back, Home's list
  is ordered and sees every write.

## Contributing

The rules of the codebase are in [`AGENTS.md`](AGENTS.md), written for both people and coding agents; the
procedures (adding a program or a service, writing a view, releasing) are skills under `.agents/skills/`,
plain Markdown that any agent reads. The designs of larger features, with the facts they rely on (an external
API's behaviour, checked against it), are under `docs/`. Code, comments and documentation are in English.
