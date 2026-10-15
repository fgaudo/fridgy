# Source map

An Elm-style app: one global state, a pure `update`, effects as commands and subscriptions, a pure view.
Rules and conventions are in [`AGENTS.md`](../AGENTS.md).

```
src/
├─ entrypoints/          how the app is started, one file per environment
│  ├─ production.ts      sqlite, bundled view
│  ├─ development.ts     in-memory data, hot-reloaded view
│  └─ run.ts             shared: starts the engine and renders
│
├─ app/                  the application (environment-agnostic)
│  ├─ program.ts         public: the root Program and its types
│  ├─ view.ts            public: the root view (hot-reload entry in development)
│  ├─ sqlite.layer.ts    public: every adapter, data in sqlite
│  ├─ in-memory.layer.ts public: every adapter, data in memory
│  ├─ program/           private: messages, state, model, update, subs, commands
│  ├─ ports/             private: services the root needs (e.g. Shell)
│  ├─ adapters/          private: implementations of those ports
│  └─ pages/<page>/      private: each page has the same shape as app/
│     ├─ program.ts · view.ts · *.layer.ts    the page's public API
│     └─ program/ · domain/ · ports/ · adapters/
│
├─ infrastructure/       technical building blocks: sqlite, sql, renderer, hot reload
├─ libs/                 generic, reusable code (elm runtime, branded numbers, …)
└─ assets/               index.html and styles
```

## Reading order

1. `app/program.ts` and `app/view.ts` — what the app is.
2. `app/pages/home/program.ts` and `program/` — a page: messages → `update` → state → `makeModel` → view.
3. `app/pages/home/ports/` — what the page needs from the outside world.
4. `entrypoints/` — how everything is wired for each environment.

## Visibility

Only the files at the root of `app/` (and of each page) may be imported from outside. Subfolders are
private; biome's `noRestrictedImports` rule enforces it.
