# Source map

An Elm-style app: one global state, a pure `update`, effects as commands and subscriptions, a pure view.
Rules and conventions are in [`AGENTS.md`](../AGENTS.md).

```
src/
├─ entrypoints/
│  ├─ native.ts          how the app is started on Android: op-sqlite as the storage, `fetch` as the HTTP client,
│  │                     Android's back button, the root view drawn by React; the tests pick their own
│  └─ crash/view.tsx     the screen a crash leaves, with a button that runs the program again
│
├─ domain/               the entities and their rules (`Product`): imports nothing but libs/
│
├─ app/                  the application (platform-agnostic)
│  ├─ program.ts         public: the root Program: the stack of pages
│  ├─ view.tsx           public: the root view: the page on top, keyed by its name
│  ├─ layer.ts           public: every adapter that has no alternative, the vibrations' included;
│  │                     needs a `SqlClient` and an `HttpClient`
│  ├─ children/<child>/  a child Program (of the root: a page), of the same shape as the root, at any depth; of
│  │  │                  app/, it imports only its own folder, and the infrastructure's services
│  │  ├─ program.ts · view.tsx · layer.ts   its public API: the only modules its parent imports
│  │  ├─ services/<service>/   a service of its own, with its adapters, contract and tests
│  │  │                        (`add-products/services/scanner/`, `add-products/services/product-lookup/`,
│  │  │                        `edit-product/services/update-product/`)
│  │  ├─ children/<child>/     its own children (`home/children/products/`, with
│  │  │                        `services/product-list/`)
│  │  └─ programs/<program>/   none yet: a program two programs of this subtree use, of this same shape
│  └─ programs/<program>/  none yet: a program two pages use, of the same shape as a child and used like one
│                          (see "Visibility")
│
├─ infrastructure/       what the app's adapters share: the storage (storage/: the database's engine, op-sqlite on
│                        the phone or wa-sqlite in memory for the tests, its schema and migrations, how a product is
│                        written, updated, deleted and how its rows are joined and encoded, `ProductStore`, how a
│                        setting is read and written, `SettingStore`, how the order of a date's digits is kept,
│                        `DateOrderStore` in `date-order.ts`, how Open Food Facts' answers are cached,
│                        `BarcodeCache` in `barcodes.ts`, and the sample data), the client of Open Food Facts'
│                        API (open-food-facts/: how a code is normalized, asked for and decoded); and the
│                        platform's facts the programs use as they are: the back button (back-button/), and the
│                        vibrations (haptics/, `docs/haptics.md`); and the app's own native module, the camera that
│                        reads barcodes (barcode-camera/: the specs React Native's codegen reads, and its reads as a
│                        stream). Its adapters are named as the app's,
│                        `<service>.<backing>.ts`
├─ libs/                 generic, reusable code: the React bridge (tea-react: handlers, renderer, test support),
│                        sources, timers (a zoned clock, a one-shot timer), branded numbers, dates (a day of the
│                        calendar, with no zone; the orders of a date's digits, the days they name, the rules of
│                        typing them on a keypad), test helpers, …
├─ palette.generated.ts  the names of Material 3's color roles, whose values, per theme, are Android's resources;
│                        both written by `bun run update-palette`
└─ styles.ts             Material's look, which every view uses (`#styles`): the color roles, as Android's
                         resources of the theme in use, the type scale, shapes, elevation and the icons
```

The runtime of the Elm architecture is a library, an npm dependency:
[`@fgaudo/effect-tea`](https://github.com/fgaudo/effect-tea).

The text is drawn in the system's fonts: Android has a family for every script, and scales it with the user's font
size. The only font the app ships is its icons, Material Symbols, whole (every icon: a view may name any), which
`bun run update-icons` decompresses into the Android project's assets, where React Native finds a family by its
file's name. A view draws an icon by its name (`icon` in `styles.ts`), which the font turns into its glyph.

## Reading order

1. `app/program.ts` and `app/view.tsx` — what the app is.
2. `app/children/about/program.ts` — a page in one module: state, messages, `update`, commands, `makeModel`.
3. `app/children/home/program.ts` and its `children/` — a page with a child, declared like the pages in the
   root.
4. `app/children/home/children/products/services/` — what a program needs from the
   outside world, each service owned by what uses it; `domain/` — the entities and their rules.
5. `entrypoints/native.ts` — how everything is wired on the phone.

## Visibility

Dependencies point inwards: `domain/` imports only `libs/`; `infrastructure/` the domain and `libs/`; `app/`
all three, and `styles.ts` (`#styles`); the entrypoints everything; `libs/` knows nothing of the app. Within `app/`, visibility follows the
role a file's name gives it. Biome's `noRestrictedImports` rule (`biome.json`) enforces all of it:

- inside `app/`, imports go downwards only: a program uses its own services and children, never a parent or a
  sibling (another child, another program's service), and a child only through its `program.ts`, `view.tsx`
  and `layer.ts`, at every depth; and the infrastructure's services, for the platform's facts it takes as they
  are;
- a program two programs use lives in `programs/` of their lowest common parent, and every program of that
  parent's subtree reaches it as it reaches a child, through its three modules, by a relative import
  (`../../programs/<program>/program.ts`) or, from deeper than `../../`, an alias. None exists yet, but Biome
  already allows these: `../../programs/<program>/` from a child of the parent, `#app/programs/<program>/` for
  the root's from any depth; a deeper parent's, from a grandchild of it, needs an override on that parent's
  folder, added with the first such program;
- adapters (`<service>.<backing>.ts`) are imported only by a `layer.ts`, by the entrypoints, which pick among
  alternatives, and by their own tests: a program uses its services;
- from outside `app/`, only its root modules (`program.ts`, `view.tsx`, `layer.ts`); the entrypoints also reach
  the adapters, and `scripts/cli.ts` the one that reads the file it generates (`licenses.bundled.ts`), for the
  schema it writes with;
- test-only code (`*.test_*.ts`, `@fgaudo/effect-tea/testing`) is imported only by tests, so it stays out of
  bundles; relative imports climb at most `../../`, another part of the project is reached through its alias
  (`#app/…`, `#domain/…`, `#infrastructure/…`, `#libs/…`, `#styles`, from the `imports` of `package.json`).
