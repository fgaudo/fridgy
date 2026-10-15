# Fridgy — guide for Claude

Android app written in TypeScript, packaged with **Capacitor**. Functional, **Elm**-style architecture built
with **Effect v4** (`effect@^4`, modules imported as `effect/Effect`, `effect/Layer`, …) and **snabbdom** for
the view. Runtime/tooling: **Bun**. Current status: the app is NOT working yet and is in the middle of a
refactoring (many imports point to old paths, see "Refactoring status").

## Language

- All code, comments, identifiers, commit messages and `.md` files must be written in **English**.
- Chat with the user may be in Italian.

## Architectural rules (mandatory)

1. **Runtime errors are handled with Effect.** Every expected error (I/O, DB, Capacitor plugins, parsing, …)
   is typed in Effect's error channel and handled explicitly. No scattered `try/catch`, no `throw` for
   expected errors, no bare Promises: wrap them with `Effect.tryPromise`/`Effect.try`.
2. **Bugs (defects) must crash the app.** A violated invariant is a defect (`Effect.die`, `Effect.orDie`):
   it must not be silenced, retried, or turned into a "recoverable" message. Do not add fallbacks that hide
   bugs. The only exception is generic code reusable in other projects (`src/libs/`), which may offer
   *opt-in* recovery (e.g. `makeDefectMessage` in `Engine.make`); the app never opts in.
3. **As close to Elm as possible.** `init`, a pure `update` `(msg) => (state) => ({ state, commands? })`,
   `subscriptions` derived from state, a pure `view` over the `Model`. Effects live only in *commands*
   (Effects that return a message) and *subscriptions* (Streams of messages). The primitives are in
   `src/libs/elm/`: `engine.ts` (`Update`, `Step`, `Command`, `Emitter`, `make`, imported as `Engine`),
   `program.ts` (pages and the root expose a `Program`; children are lifted into parents with `embed`) and
   `view.ts` (views are pure `(model, dispatch) => VNode` functions).
4. **A single global state** for everything: UI and logic. No local component/view state, no mutable
   refs/singletons outside the state.
5. **Self-contained pages.** Each page in `src/app/pages/<page>/` is a module with a small public API made
   of the files at its root; **every subfolder is private** to the page (enforced by biome
   `noRestrictedImports`). Inside a page, files import each other with relative paths. Public files:
   - `program.ts` — the `Program` and the types the root needs (`State`, `Model`, `Message`,
     `InternalMessage`, `Deps`)
   - `view.ts` — the page view
   - `sqlite.ts`, `in-memory.ts`, … — one adapter composition per setup, named after *what* backs the
     ports (never after an environment: environments only exist in `src/main/`)
   They are separate files on purpose: the view is bundled on its own for hot reload, and each setup must
   only pull in its own dependencies. Privately, a page contains:
   - domain types (`domain/`)
   - messages (public `Message` + `InternalMessage`)
   - `State`, `Model` + `makeModel`
   - `update` + `init`, `subscriptions`
   - **ports** (`ports/<capability>.ts`): one `Context.Service` per external capability (e.g. `Products`,
     `Viewport`, `Notifications`), grouping that capability's *commands* (Effects / `RequestResolver`s) and
     *events* (Streams). Ports speak in domain data, never in page messages: `subs.ts` turns events into
     messages and `commands.ts` turns command results into messages.
   - **adapters** (`adapters/<capability>/<implementation>.ts`, e.g. `products/sql.ts`,
     `products/in-memory.ts`), each exporting a `layer`, composed by the public `sqlite.ts`, `in-memory.ts`, …
     (never several setups in the same file, so a bundle only includes the implementations it
     uses)
6. **Root in `src/app/`**: structured exactly like a page, one level up. Public files at its root
   (`program.ts`, `view.ts`, `sqlite.ts`, `in-memory.ts`) are the only things code outside `src/app` may import;
   `core/` (messages, state, model, update, subs, commands), `ports/`, `adapters/` and `pages/` are private
   (enforced by biome). Inside `src/app` files use relative imports, and the root reaches each page only
   through the page's public files. Pages are **lifted into the root** with `embed` (e.g. `GotHomeMsg`,
   `state.page.Home`, subscription keys prefixed by the page name); the root `sqlite.ts`/`in-memory.ts`
   merge the root adapters with the matching page setups.
7. **Entrypoints in `src/main/`**: the only place that knows about environments. `production.ts` and
    `development.ts` each pick an app setup, the root view source (bundled, or hot reloaded), the log level
   and the infrastructure, then call `run` (`run.ts`, environment-agnostic). `scripts/cli.ts` builds only
   the entrypoint of the requested environment, so each bundle contains only what it uses; never branch on
   `process.env.NODE_ENV` inside shared code.
8. **State ≠ Model**, both in pages and in the root.
   - `State`: everything the program needs (versions, internal flags, raw data, …).
   - `Model`: the public projection of `State` for the view, containing only the data it needs.
     Available actions are exposed in the Model as tagged enums carrying the message to dispatch
     (e.g. `canDeleteSelected: { _tag: 'True', deleteMessage } | { _tag: 'False' }`), so the view makes no
     logic decisions.
9. **`src/infrastructure/`** (alias `@/infra/*`): everything pages need to access data and the platform
   (sqlite/wasm worker, sql helper and migrations, snabbdom renderer, css refresher, …). Pages depend on
   their own ports; page adapters use the infrastructure.
10. **`src/libs/`** (alias `@/libs/*`): generic code only, with no knowledge of the app domain. Organized
   in one folder per module; files of the same module import each other relatively, other modules via the
   alias:
   - `elm/` — engine, program composition, view types
   - `numbers/` — branded `Integer`, `PositiveInteger`, `UnitInterval`
   - `collections/` — `NonEmptyArray`, `NonEmptyHashSet` helpers
   - `strings/` — `NormalizedString`
   - `ui/` — `cn` (clsx + tailwind-merge)
   - `dynamic-import/` — `saferImport`
   - `testing/` — Exit assertions for tests
   - `types/` — type-level utilities
11. **Runs locally**: the app must be runnable in a local browser (not only on Android).
12. **View hot reload**: in dev, `scripts/cli.ts watch` rebuilds and notifies over WebSocket; the
    development entrypoint (`src/main/development.ts`, via `src/infrastructure/hot-module.ts`) re-imports the root view module (`src/app/view.ts`) and `CssRefresher` reloads the CSS. Global state
    survives the reload because it lives in the engine, not in the view. When moving files,
    **update the paths in `scripts/cli.ts`** (view entrypoint and watched folders).

## Code conventions

- `.ts` extension required in imports (biome `useImportExtensions`, `allowImportingTsExtensions`).
- Namespace imports for effect modules: `import * as Effect from 'effect/Effect'`. Aliases:
  `Array → Arr`, `Option → Opt`, `Request → Req`, `Tuple → T`.
- Path aliases (tsconfig): `@/app/*`, `@/infra/*`, `@/libs/*`. Do not use other aliases.
- Messages and unions: `Data.TaggedEnum` + `Data.taggedEnum`; match with `Match.tag` / `_tag` checks.
- Services: `class X extends Context.Service<X, Shape>()('<hash>')` with a hashed key (language service
  keyPattern `default-hashed`). Implementations as `Layer`s.
- Access external resources via `Request`/`RequestResolver` where it makes sense (batching).
- No `console`, `Date`, `Math.random`, `fetch` or global timers inside Effect: use `Effect.log*`,
  `Clock`/`DateTime`, `Random`, platform services (language service rules in `tsconfig.json`).
- `strictBooleanExpressions`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` are enabled.
- State and model are `Readonly`; prefer branded types (`Brand`) for values with invariants.
- Linting: biome (formatter disabled); formatting with dprint.

## Commands

```bash
bun install            # prepare script patches typescript with @effect/tsgo
bun run watch          # dev build into dist/ + WS server for hot reload (host/port from .env)
bun run http-server    # serve dist/ to try the app in the browser
bun run build          # production build into dist/
bunx tsc --noEmit      # typecheck
bun test               # tests (*.test.ts)
bunx cap sync android  # copy dist/ into the Android project
```

`.env` is created from `.env.default` the first time the CLI runs (`UI_EMITTER_WEBSOCKET_HOST/PORT`).

## Refactoring status (verify before working)

The structure has been moved towards `src/app/...` but some parts are still inconsistent:
- the `about` page does not follow the page structure yet (`outbound/`, `infrastructure/outbound/`), and
  `src/infrastructure/sayings` imports from it;
- tests use `vitest`/`@effect/vitest` and Effect v3 APIs and do not compile.

When an item in this section is resolved, update this file.
