# Fridgy

Fridgy keeps track of the food in your fridge and of when it expires. It is an Android app (and a web app
during development) written in TypeScript, with a strictly functional, [Elm](https://elm-lang.org)-style
architecture.

> **Status:** work in progress. The main page (product list, adding and deleting products, expiration
> tracking) is being rebuilt on the current architecture; other pages are not migrated yet.

## Stack

| | |
| --- | --- |
| Language | TypeScript, with the Effect language service (`@effect/tsgo`) |
| Effects, services, streams | [Effect](https://effect.website) v4 |
| View | [snabbdom](https://github.com/snabbdom/snabbdom) (virtual DOM) and [Tailwind CSS](https://tailwindcss.com) |
| Storage | SQLite (WebAssembly, in a worker) |
| Android packaging | [Capacitor](https://capacitorjs.com) |
| Runtime, bundler, tests | [Bun](https://bun.com), with [fast-check](https://fast-check.dev) for property tests |
| Lint | [Biome](https://biomejs.dev) |

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

| Command | |
| --- | --- |
| `bun run typecheck` | Type-check the project |
| `bun run test` | Run the tests |
| `bun run lint` | Lint, including the import rules described below |

## Architecture

The whole app is one Elm-style program:

- a **single global state**, changed only by a pure `update(message)(state)`;
- **effects as data**: `update` returns *commands* (Effects that may produce a message), and *subscriptions*
  turn the outside world (database changes, scrolling, a clock) into messages;
- a **pure view**: `makeModel` projects the state onto what the view needs, and the view turns that model
  into a virtual DOM.

The runtime that runs the program lives in `src/libs/elm/`. A few choices go beyond plain Elm:

- **Rejection.** When a message makes no sense in the current state, `update` returns `Engine.reject`. The
  engine knows which displayed state every click comes from: a click on an outdated frame is simply ignored,
  while a message rejected for the current state is a bug, and crashes the app.
- **Asynchronous operations carry an id**, so a late completion can never overwrite a newer one.
- **Bugs crash the app**; expected errors are typed and handled with Effect.

Each page is a self-contained module that owns its domain, messages, state, update, view and **ports**
(the services it needs from the outside, such as product storage), with **adapters** implementing them for
each setup (SQLite, in memory, …). Only the files at the root of a page are public; Biome rejects imports
of anything deeper. Environments (production, development) exist only in `src/entrypoints/`.

See [`src/README.md`](src/README.md) for a map of the source tree and a suggested reading order.

## Tests

Tests sit next to the code they test (`*.test.ts`) and are mostly property tests: fast-check generates
thousands of states and messages and checks that the rules hold for all of them. Every branded type and
domain type has an `*.arbitrary.ts` file with its generators. Among others, the tests check that:

- `update` is deterministic and never throws;
- every message the real view can send, in any state, is accepted by `update`;
- a stored product reads back as the same product.

## Contributing

The rules of the codebase (architecture, conventions, what is still being migrated) are in
[`AGENTS.md`](AGENTS.md), written for both people and coding agents. Code, comments and documentation are
in English.
