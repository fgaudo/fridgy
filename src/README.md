# Source map

An Elm-style app: one global state, a pure `update`, effects as commands and subscriptions, a pure view.
Rules and conventions are in [`AGENTS.md`](../AGENTS.md).

```
src/
├─ entrypoints/
│  ├─ native.tsx         how the app is started on Android: op-sqlite as the storage, the lookup on Open Food
│  │                     Facts through `fetch`, Android's back button, camera, vibrator, keyboard and links, the
│  │                     program started here, not by a component, so that a recreated activity keeps the page
│  │                     shown, and drawn by React; the tests pick their own
│  └─ crash/view.tsx     the screen a crash leaves, with a button that runs the program again
│
├─ domain/               the entities and their rules (`Product`): imports nothing but libs/
│
├─ app/                  the application (platform-agnostic)
│  ├─ program.ts         public: the root Program: Home, and at most one page over it, a child by its visit
│  ├─ view.tsx           public: the root view: the page shown, keyed by its name and its visit
│  ├─ layer.ts           public: the only layer of app/, the stores; needs a `SqlClient`
│  ├─ children/<child>/  a child Program (of the root: a page), of the same shape as the root, at any depth; of
│  │  │                  app/, it imports only its own folder, and the infrastructure's services
│  │  ├─ program.ts · view.tsx   its public API: the only modules its parent imports
│  │  ├─ <concern>.ts          a module of a program split by concern (`add-products/`, `home/children/products/`),
│  │  │                        private to its folder
│  │  ├─ children/<child>/     its own children (`home/children/products/`, `add-products/children/fridge/`)
│  │  └─ programs/<program>/   a program two programs of this subtree use, of this same shape (none yet)
│  └─ programs/<program>/  a program two pages use, of the same shape as a child and used like one (see
│                          "Visibility"): `snackbar/` (Material's snackbar, whose model its parents draw: no view)
│                          and `expiration/` (the expiration date typed on a keypad, with the order its digits are
│                          read in, which `DateOrderStore` keeps)
│
├─ infrastructure/       what the programs need from outside, which they use as it is: the storage (storage/: the
│                        database's engine, op-sqlite on the phone or wa-sqlite in memory for the tests, its schema
│                        and migrations, and the stores: the products', `ProductStore`, the list and its changes,
│                        and the writes, each in one transaction; the order of a date's digits, `DateOrderStore` in
│                        `date-order.ts`, on how a setting is read and written, `SettingStore`; Open Food Facts'
│                        answers, cached, `BarcodeCache` in `barcodes.ts`); the lookup of a scanned product
│                        (product-lookup/: the cache's rules, on the client of Open Food Facts' API, open-food-facts/:
│                        how a code is normalized, asked for and decoded); the licenses the About page shows, and
│                        the two files they are generated in (licenses/); and the platform's facts: the back button
│                        (back-button/), how far the keyboard covers the window (keyboard/), the opening of a link
│                        (links/), the vibrations (haptics/, `docs/haptics.md`), and the app's own native module,
│                        the camera that reads barcodes (barcode-camera/: the specs React Native's codegen reads).
│                        Its adapters are named `<service>.<backing>.ts`
├─ libs/                 generic, reusable code: what the app adds to effect-tea's bridge to React (tea-react: the
│                        views' handlers, the renderer that draws the app or a screen in its place, test support),
│                        sources, timers (a zoned clock, a one-shot timer), Material's durations, branded numbers,
│                        dates (a day of the calendar, with no zone; the orders of a date's digits, the days they
│                        name, the rules of typing them on a keypad), test helpers, …
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
4. `infrastructure/` — what a program needs from the outside world, which it asks as it is:
   `storage/products.ts`, the products' store, and `barcode-camera/`, a fact of the platform with an adapter of
   React Native's; `domain/` — the entities and their rules.
5. `entrypoints/native.tsx` — how everything is wired on the phone.

## Visibility

Dependencies point inwards: `domain/` imports only `libs/`; `infrastructure/` the domain and `libs/`; `app/`
all three, and `styles.ts` (`#styles`); the entrypoints everything; `libs/` knows nothing of the app. Within `app/`, visibility follows the
role a file's name gives it. Biome's `noRestrictedImports` rule (`biome.json`) enforces all of it:

- inside `app/`, imports go downwards only: a program uses its own children, never a parent or a sibling, and a
  child only through its `program.ts` and `view.tsx`, at every depth, never through the modules of its concerns; and the infrastructure's services, which it
  takes as they are;
- a program two programs use lives in `programs/` of their lowest common parent, and every program of that
  parent's subtree reaches it as it reaches a child, through the modules at its root, by a relative import
  (`../../programs/<program>/program.ts`) or an alias. Biome allows `../../programs/<program>/` from a child of
  the parent, and `#app/programs/<program>/` for the root's from any depth, as the pages reach theirs; a deeper
  parent's, from a grandchild of it, needs an override on that parent's folder, added with the first such
  program;
- adapters (`<service>.<backing>.ts`) are imported only by the entrypoints, which pick among alternatives, and
  by tests: a program uses the services;
- from outside `app/`, only its root modules (`program.ts`, `view.tsx`, `layer.ts`);
- test-only code (`*.test_*.ts`, `@fgaudo/effect-tea/testing`) is imported only by tests, so it stays out of
  bundles; relative imports climb at most `../../`, another part of the project is reached through its alias
  (`#app/…`, `#domain/…`, `#infrastructure/…`, `#libs/…`, `#styles`, from the `imports` of `package.json`).
