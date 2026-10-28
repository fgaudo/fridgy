# Source map

An Elm-style app: one global state, a pure `update`, effects as commands and subscriptions, a pure view.
Rules and conventions are in [`AGENTS.md`](../AGENTS.md).

```
src/
├─ entrypoints/          how the app is started, one file per environment: each picks what has alternatives
│  ├─ production.ts      sqlite in a worker (OPFS), `fetch` as the HTTP client, Capacitor's back button,
│  │                     bundled view
│  ├─ development.ts     sqlite in memory with sample products, `fetch` as the HTTP client, the browser's back
│  │                     button, hot-reloaded view
│  └─ run.ts             shared: runs the program (`@fgaudo/effect-tea` `run`) with the snabbdom renderer
│
├─ domain/               the entities and their rules (`Product`): imports nothing but libs/
│
├─ app/                  the application (environment-agnostic)
│  ├─ program.ts         public: the root Program: the stack of pages
│  ├─ view.tsx           public: the root view (hot-reload entry in development)
│  ├─ layer.ts           public: every adapter that has no alternative, the toasts' included; needs a
│  │                     `SqlClient` and an `HttpClient`
│  ├─ children/<child>/  a child Program (of the root: a page), of the same shape as the root, at any depth; of
│  │  │                  app/, it imports only its own folder, and the infrastructure's services
│  │  ├─ program.ts · view.tsx · layer.ts   its public API: the only modules its parent imports
│  │  ├─ services/<service>/   a service of its own, with its adapters, contract and tests
│  │  │                        (`add-products/services/scanner/`, `add-products/services/product-lookup/`)
│  │  ├─ children/<child>/     its own children (`home/children/products/`, with
│  │  │                        `services/product-list/`)
│  │  └─ programs/<program>/   none yet: a program two programs of this subtree use, of this same shape
│  └─ programs/<program>/  none yet: a program two pages use, of the same shape as a child and used like one
│                          (see "Visibility")
│
├─ infrastructure/       what the app's adapters share: the storage (storage/: the database's engine, sqlite in
│                        a worker on OPFS or in memory, its schema and migrations, how a product is written, deleted and
│                        how its rows are joined and encoded, `ProductStore`, how a setting is read and written,
│                        `SettingStore`, how Open Food Facts' answers are cached, `BarcodeCache` in
│                        `barcodes.ts`, and the sample data), the client of Open Food Facts' API
│                        (open-food-facts/: how a code is normalized, asked for and decoded), hot reload,
│                        fonts; and the platform's facts the programs use as they are: the back button
│                        (back-button/: Capacitor's, or the browser's history; the entrypoints pick one) and the
│                        toasts (notifications/). Its adapters are named as the app's, `<service>.<backing>.ts`
├─ libs/                 generic, reusable code: the snabbdom bridge (tea-snabbdom: handlers, renderer,
│                        test support) and JSX runtime, sources, branded numbers, barcodes (the expansion of
│                        a UPC-E), `defect`, test helpers, …
├─ index.html            the page template: the build fills in the fonts and the entrypoint
├─ error.html            shown by Capacitor instead of the app on a WebView older than it needs
├─ palette.generated.css the Material 3 color roles, written by `bun run update-palette`
└─ styles.css            the stylesheet (Tailwind): Material's type scale, shapes, elevation, motion and state layer
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
2. `app/children/about/program.ts` — a page in one module: state, messages, `update`, commands, `makeModel`.
3. `app/children/home/program.ts` and its `children/` — a page with a child, declared like the pages in the
   root.
4. `app/children/home/children/products/services/` — what a program needs from the
   outside world, each service owned by what uses it; `domain/` — the entities and their rules.
5. `entrypoints/` — how everything is wired for each environment.

## Visibility

Dependencies point inwards: `domain/` imports only `libs/`; `infrastructure/` the domain and `libs/`; `app/`
all three; the entrypoints everything; `libs/` knows nothing of the app. Within `app/`, visibility follows the
role a file's name gives it. Biome's `noRestrictedImports` rule (`biome.json`) enforces all of it:

- inside `app/`, imports go downwards only: a program uses its own services and children, never a parent or a
  sibling (another child, another program's service), and a child only through its `program.ts`, `view.tsx`
  and `layer.ts`, at every depth; and the infrastructure's services, for the platform's facts it takes as they
  are;
- a program two programs use lives in `programs/` of their lowest common parent, and every program of that
  parent's subtree reaches it as it reaches a child, through its three modules, by a relative import
  (`../../programs/<program>/program.ts`) or, from deeper than `../../`, an alias. None exists yet: today
  every import that climbs is refused, and the rule that allows these is added with the first such program;
- adapters (`<service>.<backing>.ts`) are imported only by a `layer.ts`, by the entrypoints, which pick among
  alternatives, and by their own tests: a program uses its services;
- from outside `app/`, only its root modules (`program.ts`, `view.tsx`, `layer.ts`) and, for the entrypoints,
  the adapters;
- test-only code (`*.test_*.ts`, `@fgaudo/effect-tea/testing`) is imported only by tests, so it stays out of
  bundles; relative imports climb at most `../../`, another part of the project is reached through its alias
  (`#app/…`, `#domain/…`, `#infrastructure/…`, `#libs/…`, from the `imports` of `package.json`).
