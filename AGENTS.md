# Fridgy — guide for coding agents

Android app written in TypeScript, packaged with **Capacitor**. Functional, **Elm**-style architecture built
with **Effect v4** (`effect@^4`, modules imported as `effect/Effect`, `effect/Layer`, …) and **snabbdom** for
the view. Runtime/tooling: **Bun**. Current status: the app is NOT working yet and is in the middle of a
refactoring (see "Refactoring status"). A map of the source tree is in `src/README.md`.

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
3. **As close to Elm as possible.** `init`, a pure `update` `(msg) => (state) => Engine.Transition` (`{ state, commands?, events? }` or `Engine.reject`),
   `subscriptions` derived from state, a pure `view` over the `Model`. Effects live only in *commands*
   (Effects that return an optional message: `None` for effects that only act on the outside world) and
   *subscriptions* (Streams of messages). The primitives are in
   `src/libs/elm/`: `engine.ts` (`Update`, `Step`, `Command`, `Emitter`, `make`, imported as `Engine`),
   `program.ts` (pages and the root expose a `Program`; children are lifted into parents with `embed`) and
   `view.ts` (views are pure `(model, dispatch) => VNode` functions). A page never acts on its parent: it
   returns *events* (the Elm "OutMsg" pattern, e.g. `InfoRequested`, `LeaveRequested`), declared as a public
   `Event` type, and the parent handles them in `embed`'s `onEvent`, which the types require whenever the
   child has events.
4. **Rejection.** When a message makes no sense in the current state, `update` returns `Engine.reject`
   (never a log or a "wrong state" command). Actions that are only sometimes possible are exposed by the
   model (`canX: { _tag: 'True', message } | { _tag: 'False' }`), and the view dispatches them only from
   there. The conditions live in `program/guards.ts`, used by **both** `update` (to accept or reject) and
   `makeModel` (to offer or not), so the two cannot disagree. The engine numbers states (revisions) and
   remembers which revision every view message comes from: a message rejected for the *current* revision means
   the view sent something `update` does not accept — a bug, so the engine dies with `RejectedMessage`; a
   message rejected for an *older* revision (a click on an outdated frame, a double tap), or coming from a
   command or subscription, is stale and ignored. Each page's `update.test.ts` renders the real view for
   arbitrary states, fires every handler and checks that `update` accepts every dispatched message: this is
   what keeps the engine from dying by mistake. Snabbdom hooks must not dispatch messages `update` may reject.

   Asynchronous operations get an id from the state (`nextOperation`), the state remembers the operation in
   progress (e.g. `Deleting { operation }`, `Submitting { operation }`), and the
   completion message carries the id back: `update` applies it only if it matches, and rejects it otherwise.
   Model the state as explicit, independent state machines (one per concern: data, selection, form, …)
   rather than shared flags, so that impossible combinations cannot be represented. Never store derived data:
   values that depend on time (expiration status, freshness, …) are computed in `makeModel` from a `now`
   kept in the state by a clock subscription, so `update` stays pure and needs no command to validate.
5. **A single global state** for everything: UI and logic. No local component/view state, no mutable
   refs/singletons outside the state.
6. **Self-contained pages.** Each page in `src/app/pages/<page>/` is a module with a small public API made
   of the files at its root; **every subfolder is private** to the page (enforced by biome
   `noRestrictedImports`). Inside a page, files import each other with relative paths. Public files:
   - `program.ts` — the `Program` and what the root needs: the page's contract is `ExternalMessage` (what
     the parent may send, e.g. `BackPressed`; exported with its constructors), `Event` (what the page asks
     of its parent) and `Model`; `Message` (everything the page handles: `ExternalMessage` plus what its
     view, subscriptions and commands generate) is exported as a type only, so code outside the page cannot
     forge a click or a completion. Also `State` and `Deps`; it is the facade of the private `program/` folder
   - `view.ts` — the page view
   - `sqlite.layer.ts`, `in-memory.layer.ts`, … — one adapter composition (`layer`) per setup, named after
     *what* backs the ports, never after an environment (environments only exist in `src/entrypoints/`)

   They are separate files on purpose: the view is bundled on its own for hot reload, and each setup must
   only pull in its own dependencies. Privately, a page contains:
   - `program/` — the Elm program: `messages.ts` (`ExternalMessage`, `Message`, `Event`), `state.ts`,
     `model.ts` (`Model` + `makeModel`), `update.ts` (`update` + `init`), `guards.ts`, `subs.ts`, `commands.ts`
   - `domain/` — domain types and logic
   - `ports/<capability>.ts` — one `Context.Service` per external capability (e.g. `Products`,
     `Viewport`, `Notifications`), grouping that capability's *commands* (Effects / `RequestResolver`s) and
     *events* (Streams). Ports speak in domain data, never in page messages: `subs.ts` turns events into
     messages and `commands.ts` turns command results into messages. Persistence ports take the domain's
     `Snapshot` (branded: only `toSnapshot` makes one, so it always comes from a valid object) and return
     `UnvalidatedSnapshot`s, which the page validates with `fromSnapshot`. Adapters never read the fields of
     domain objects: only the domain knows which fields are persistent and which are derived.
   - `adapters/<capability>/<implementation>.ts` (e.g. `products/sql.ts`, `products/in-memory.ts`), each
     exporting a `layer`, composed by the public `*.layer.ts` files (never several setups in the same
     file, so a bundle only includes the implementations it uses)
7. **Root in `src/app/`**: structured exactly like a page, one level up. Public files at its root
   (`program.ts`, `view.ts`, `sqlite.layer.ts`, `in-memory.layer.ts`) are the only things code outside
   `src/app` may import; `program/`, `pages/` and, when the root needs outside services, `ports/` and
   `adapters/` are private (enforced by biome).
   Inside `src/app` files use relative imports, and the root reaches each page only through the page's
   public files. Pages are **lifted into the root** with `embed` (e.g. `GotHomeMsg`, subscription keys prefixed by
   the page name). The root owns navigation: a stack of page states (the last one is shown), changed only
   when a page emits an event; Android's back button (`Shell` port) is forwarded to the shown page as
   `BackPressed`, which closes what it has open or asks to be left, and leaving the last page exits the app.
   A page is found wherever it is in the stack, so hidden pages still receive their completions; the root `*.layer.ts` files merge the root adapters with
   the matching page setups.
8. **Entrypoints in `src/entrypoints/`**: the only place that knows about environments. They also own
   the boot of the host shell: `run.ts` hides the splash screen (`src/infrastructure/splash-screen.ts`) once
   the renderer reports the first view displayed (`onFirstPaint`) and its fonts are loaded
   (`src/infrastructure/fonts.ts`), not when data is loaded. `production.ts` and
   `development.ts` each pick an app setup, the root view source (bundled, or hot reloaded), the log level
   and the infrastructure, then call `run` (`run.ts`, environment-agnostic). `scripts/cli.ts` builds only
   the entrypoint of the requested environment, so each bundle contains only what it uses; never branch on
   `process.env.NODE_ENV` inside shared code. Production uses the sqlite setup, development the in-memory
   one (no sqlite worker or wasm in the dev build).
9. **State ≠ Model**, both in pages and in the root.
   - `State`: everything the program needs (versions, internal flags, raw data, …).
   - `Model`: the public projection of `State` for the view, containing only the data it needs.
     Available actions are exposed in the Model as tagged enums carrying the message to dispatch
     (e.g. `canDeleteSelected: { _tag: 'True', deleteMessage } | { _tag: 'False' }`), decided with the
     page's guards, so the view makes no logic decisions (see rule 4).
10. **`src/infrastructure/`** (alias `@/infra/*`): everything adapters and entrypoints need to reach data
   and the platform (sqlite/wasm worker, sql helper and migrations, snabbdom renderer, hot module loader,
   css refresher, …). Pages depend on their own ports; page adapters use the infrastructure.
11. **`src/libs/`** (alias `@/libs/*`): generic code only, with no knowledge of the app domain. Organized
    in one folder per module; files of the same module import each other relatively, other modules via the
    alias:
    - `elm/` — engine, program composition, view types
    - `numbers/` — branded `Integer`, `PositiveInteger`, `UnitInterval` (each module may have a
      `*.arbitrary.ts` companion for tests)
    - `collections/` — `NonEmptyArray`, `NonEmptyHashSet` helpers
    - `strings/` — `NormalizedString`
    - `ui/` — `cn` (clsx + tailwind-merge)
    - `dynamic-import/` — `saferImport`
    - `testing/` — Exit assertions for tests
    - `types/` — type-level utilities
12. **Runs locally**: the app must be runnable in a local browser (not only on Android).
13. **View hot reload**: in dev, `scripts/cli.ts watch` rebuilds and notifies over WebSocket; the
    development entrypoint (`src/entrypoints/development.ts`, via `src/infrastructure/hot-module.ts`)
    re-imports the root view module (`src/app/view.ts`) and `CssRefresher` reloads the CSS. Global state
    survives the reload because it lives in the engine, not in the view. When moving files,
    **update the paths in `scripts/cli.ts`** (entrypoints, view entrypoint and watched folders).

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
- Tests: `bun:test` with `fast-check` property tests, in a `*.test.ts` file next to the module under test
  (e.g. `pages/home/program/update.test.ts`). Properties state the *intended* behaviour; when the code
  does not satisfy one yet, keep it as `test.failing` with the bug in its name, so the suite stays green and
  flags the fix.
- Every page's `update.test.ts` checks that the view and `update` agree (rule 4): it renders the real view
  for arbitrary states, fires every event handler and asserts `update` accepts what they dispatch. Rejections
  are asserted explicitly (`Engine.isRejected`), never as "state unchanged". `bun test` preloads
  `src/libs/testing/preload.ts` (see `bunfig.toml`), which declares the `window` global snabbdom reads.
- Tests may import a page's private files (biome allows it for `*.test.ts` only): a test drives a page
  the way its own view and subscriptions would, e.g. the root tests build Home's `Message`s.
- Arbitraries: every branded type in `src/libs/` has a companion `<module>.arbitrary.ts` (e.g.
  `numbers/positive-integer.arbitrary.ts`) exporting a fast-check `arbitrary` that only produces valid values.
  Tests build their generators from these instead of calling `*Unsafe` constructors. `fast-check` and
  `*.arbitrary.ts` may only be imported by `*.test.ts` and `*.arbitrary.ts` files (biome), so production
  bundles never include them. When adding a branded type, add its arbitrary too. The same goes for domain
  types in pages (e.g. `domain/product.arbitrary.ts`: valid products, the snapshots `fromSnapshot` accepts,
  and anything a storage may return). State arbitraries live in `program/state.arbitrary.ts`.

## Commands

```bash
bun install            # prepare script patches typescript with @effect/tsgo
bun run watch          # dev build into dist/ (data in memory), served with hot reload (host/port from .env)
bun run build          # production build into dist/ (sqlite)
bun run typecheck      # typecheck
bun run lint           # lint (includes the import-privacy rules)
bun run test           # tests (*.test.ts)
bunx cap sync android  # copy dist/ into the Android project
```

`.env` is created from `.env.default` the first time the CLI runs, and read from disk (`DEV_SERVER_HOST`,
`DEV_SERVER_PORT`, with defaults). `watch` serves `dist/` and the hot reload socket (`/hot-reload`) on the
same port: it sends `reload-view` when only `view.ts` files or CSS changed (the view is swapped, the state
kept) and `reload-page` otherwise.

## Refactoring status (verify before working)

Some parts are still inconsistent:
- the `about` page is a skeleton (licenses and a random saying); some sayings contain `<br />`, shown as
  text;
- older tests (`src/libs/numbers/*.test.ts`) use `vitest`/`@effect/vitest` and
  Effect v3 APIs and do not compile; port them to `bun:test` + `fast-check`.

When an item in this section is resolved, update this file.
