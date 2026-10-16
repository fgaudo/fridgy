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
└─ assets/               index.html and styles
```

The runtime of the Elm architecture is a local package, outside `src/`: [`packages/effect-tea`](../packages/effect-tea/README.md)
(`@fgaudo/effect-tea`).

## Reading order

1. `app/program.ts` and `app/view.tsx` — what the app is.
2. `app/pages/home/program.ts` and `program/` — a page: messages → `update` → state → `makeModel` → view.
3. `app/pages/home/ports/` — what the page needs from the outside world; `app/domain/` and `app/ports/` —
   the entities and the write ports every page shares.
4. `entrypoints/` — how everything is wired for each environment.

## Visibility

Only the files at the root of `app/` (and of each page) may be imported from outside. Subfolders are
private; biome's `noRestrictedImports` rule enforces it.
