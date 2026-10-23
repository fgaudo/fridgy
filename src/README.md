# Source map

An Elm-style app: one global state, a pure `update`, effects as commands and subscriptions, a pure view.
Rules and conventions are in [`AGENTS.md`](../AGENTS.md).

```
src/
├─ entrypoints/          how the app is started, one file per environment: each picks what has alternatives
│  ├─ production.ts      sqlite in a worker (OPFS), Capacitor's shell, bundled view
│  ├─ development.ts     sqlite in memory with sample products, the browser's shell, hot-reloaded view
│  └─ run.ts             shared: runs the program (`@fgaudo/effect-tea` `run`) with the snabbdom renderer
│
├─ domain/               the entities and their rules (`Product`): imports nothing but libs/
│
├─ app/                  the application (environment-agnostic)
│  ├─ program.ts         public: the root Program: the stack of pages, the back button
│  ├─ view.tsx           public: the root view (hot-reload entry in development)
│  ├─ layer.ts           public: every adapter that has no alternative; needs a `SqlClient` and a `Shell`
│  ├─ services/shell/    the root's service, with its adapters (`shell.capacitor.ts`, `shell.browser.ts`),
│  │                     which the entrypoints import, to pick one
│  └─ pages/<page>/      a page; of app/, it imports only its own folder
│     ├─ program.ts · view.tsx · layer.ts   the page's public API
│     ├─ services/<service>/   a service of the page, with its adapters, contract and tests
│     │                        (`services/notifications/`)
│     └─ parts/<part>/   a part of a large page, a child Program of the page, with its view and the services
│                        only it uses (`parts/products/services/product-list/`)
│
├─ infrastructure/       what the app's adapters share: the database's engine (sqlite, in a worker or in
│                        memory), its schema, migrations and table helpers (sql), sample data, hot reload,
│                        fonts
├─ libs/                 generic, reusable code: the snabbdom bridge (tea-snabbdom: handlers, renderer,
│                        test support) and JSX runtime, sources, branded numbers, test helpers, …
├─ index.html            the page template: the build fills in the fonts and the entrypoint
├─ error.html            shown by Capacitor instead of the app on a WebView older than it needs
└─ styles.css            the stylesheet (Tailwind)
```

The runtime of the Elm architecture is a library, an npm dependency:
[`@fgaudo/effect-tea`](https://github.com/fgaudo/effect-tea).

The Noto fonts, for every script the app shows, are copied by the build into `dist/fonts/` and linked from
`index.html` (`fontStylesheets` in `scripts/cli.ts`), not imported in `styles.css`: the CSS bundler would inline
them. Every font face is loaded before the splash screen hides (`infrastructure/fonts.ts`), so no text ever
swaps fonts while the app is in use. Where several languages share a script, the device's language (set as
`lang` by `index.html`) picks the family in `styles.css`: Nastaliq for Urdu, and the Japanese, Korean,
traditional or simplified forms of Chinese characters.

## Reading order

1. `app/program.ts` and `app/view.tsx` — what the app is.
2. `app/pages/about/program.ts` — a page in one module: state, messages, `update`, commands, `makeModel`.
3. `app/pages/home/program.ts` and `parts/` — a page made of parts, declared like the pages in the root.
4. `app/pages/home/parts/products/services/` — what a part needs from the
   outside world, each service owned by what uses it; `domain/` — the entities and their rules.
5. `entrypoints/` — how everything is wired for each environment.

## Visibility

Visibility follows the role a file's name gives it, and biome's `noRestrictedImports` rule enforces it:

- inside `app/`, imports go downwards only: a program uses its own services and children, never a parent or a
  sibling;
- adapters (`<service>.<backing>.ts`) are imported only by a `layer.ts`, by the entrypoints, which pick among
  alternatives, and by their own tests;
- from outside `app/`, only its root modules (`program.ts`, `view.tsx`, `layer.ts`) and, for the entrypoints,
  the adapters.
