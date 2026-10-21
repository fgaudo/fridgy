# Fridgy

Fridgy keeps track of the food in your fridge and of when it expires. It is an Android app (and a web app
during development) written in TypeScript, with a strictly functional, [Elm](https://elm-lang.org)-style
architecture.

> **Status:** work in progress. The main page (product list, adding and selecting products, expiration
> tracking) and a skeleton of the About page (licenses, a random saying) run on the current architecture,
> with navigation between them and Android's back button.

## Stack

|                            |                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Language                   | TypeScript, with the Effect language service (`@effect/tsgo`)                                                              |
| Effects, services, streams | [Effect](https://effect.website) v4                                                                                        |
| View                       | [snabbdom](https://github.com/snabbdom/snabbdom) (virtual DOM, written in TSX) and [Tailwind CSS](https://tailwindcss.com) |
| Storage                    | SQLite (WebAssembly, in a worker)                                                                                          |
| Android packaging          | [Capacitor](https://capacitorjs.com)                                                                                       |
| Runtime, bundler, tests    | [Bun](https://bun.com), with [fast-check](https://fast-check.dev) for property tests                                       |
| Lint                       | [Biome](https://biomejs.dev)                                                                                               |

## Getting started

Requirements: [Bun](https://bun.com) and, to build the Android app, Android Studio with an Android SDK.

```bash
bun install
```

### Run it in the browser

```bash
bun run watch
```

builds the development version into `dist/` (products are kept in memory), serves it, and rebuilds on every
change under `src/`; open the address it prints. Editing a view or the CSS swaps the view in place, keeping
the application state; any other change reloads the page.

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

## Development

| Command                   |                                                  |
| ------------------------- | ------------------------------------------------ |
| `bun run typecheck`       | Type-check the project                           |
| `bun run test`            | Run the tests                                    |
| `bun run lint`            | Lint, including the import rules described below |
| `bunx dprint fmt <files>` | Format the files you changed                     |

## Architecture

The whole app is one Elm-style program:

- a **single global state**, changed only by a pure `update(message)(state)`;
- **effects as data**: `update` returns _commands_ (data that the program's `runCommand` turns into Effects
  that may produce a message), and _subscriptions_
  turn the outside world (database changes, scrolling, a clock) into messages;
- a **pure view**: `makeModel` projects the state onto what the view needs, and the view turns that model
  into a virtual DOM.

The runtime is [`@fgaudo/effect-tea`](https://github.com/fgaudo/effect-tea), a library of its own. On top of
plain Elm it makes the view and `update` agree: the model only offers the actions `update` accepts, a double
tap is harmless, and pages are composed by declaring them. Its README explains how.

What the app adds:

- **The root owns navigation**, a stack of pages. Pages ask for it through events (Elm's "OutMsg"), e.g. to
  open About or to be left.
- **An asynchronous operation is a state that waits for its completion**, which only that state accepts.
- **Bugs crash the app**; expected errors are typed and handled with Effect.

How the code is organized:

- **Pages** (`src/app/pages/`) are self-contained: each owns its messages, state, `update` and view. Only the
  files at a page's root are public; Biome rejects imports of anything deeper.
- **Parts.** A large page is split by concern into parts, each a program the page declares as a child.
- **Ports and adapters.** A page's ports are the services it needs from outside (the product list, scrolling);
  adapters implement them for each setup (SQLite, in memory).
- **Shared code moves up** to `src/app/`: the entities (`Product`) and the ports that change stored data.
- **Environments** (production, development) exist only in `src/entrypoints/`.
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
- every storage adapter, in memory or SQLite (on the real migrations), passes the same contract: what is
  written reads back as itself, deletions remove exactly what they should, Home's list is ordered and sees
  every write.

## Contributing

The rules of the codebase (architecture, conventions, what is still being migrated) are in
[`AGENTS.md`](AGENTS.md), written for both people and coding agents. Code, comments and documentation are
in English.
