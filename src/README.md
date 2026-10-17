# Source map

An Elm-style app: one global state, a pure `update`, effects as commands and subscriptions, a pure view.
Rules and conventions are in [`AGENTS.md`](../AGENTS.md).

```
src/
├─ entrypoints/          how the app is started, one file per environment
│  ├─ production.ts      sqlite, bundled view
│  ├─ development.ts     in-memory data, hot-reloaded view
│  └─ run.ts             shared: runs the program (`@fgaudo/effect-tea` `run`) with the snabbdom renderer
│
├─ app/                  the application (environment-agnostic)
│  ├─ program.ts         public: the root Program and its types
│  ├─ view.tsx           public: the root view (hot-reload entry in development)
│  ├─ sqlite.layer.ts    public: every adapter, data in sqlite
│  ├─ in-memory.layer.ts public: every adapter, data in memory
│  ├─ program/           private: messages, state, model, update, subs, commands, navigation
│  ├─ domain/            private: the app's entities, used by every page
│  ├─ ports/, adapters/  private: the root's ports (Shell) and the write ports, with their adapters
│  └─ pages/<page>/      private: each page has the same shape as app/; it may import the
│     │                  domain/ and ports/ above it, never the adapters/
│     ├─ program.ts · view.tsx · *.layer.ts   the page's public API
│     └─ program/ · domain/ · ports/ · adapters/
│
├─ infrastructure/       technical building blocks: sqlite, sql, in-memory store, renderer, hot reload
├─ libs/                 generic, reusable code (the snabbdom bridge and JSX runtime, sources, branded numbers, …)
├─ index.html            the page template: the build fills in the fonts and the entrypoint
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
2. `app/pages/home/program.ts` and `program/` — a page: messages → `update` → state → `makeModel` → view.
3. `app/pages/home/ports/` — what the page needs from the outside world; `app/domain/` and `app/ports/` —
   the entities and the write ports every page shares.
4. `entrypoints/` — how everything is wired for each environment.

## Visibility

Only the files at the root of `app/` (and of each page) may be imported from outside. Subfolders are
private; biome's `noRestrictedImports` rule enforces it.
