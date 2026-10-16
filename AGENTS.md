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
   bugs. Only generic code (`src/libs/`) may offer *opt-in* recovery (`makeDefectMessage` in `Engine.make`);
   the app never opts in.
3. **As close to Elm as possible.** `init`, a pure `update` `(msg) => (state) => Engine.Transition`
   (`{ state, commands?, events? }` or `Engine.reject`), `subscriptions` derived from the state, a pure
   `makeModel` and a pure view. Effects live only in *commands* (Effects that return an optional message:
   `None` when they only act on the outside world) and *subscriptions* (Streams of messages). The
   primitives are in `src/libs/elm/`: `engine.ts` (imported as `Engine`), `program.ts` (`Program`, `embed`),
   `offer.ts` (rule 4) and `view.ts` (`View`, `Dispatch`, `mapDispatch`).
4. **Rejection and offers.**
   - When a message makes no sense in the current state, `update` returns `Engine.reject` (never a log or
     a "wrong state" command). The conditions live only in `update` (private helpers when several messages
     share one).
   - The view never builds messages: the model *offers* them, as `Offer<Message>` fields named after the
     action (`openMenu`, `deleteSelected`, …). `makeModel` asks `update` itself: `offers(update, state)`
     gives `offer(message)`, which is `Some` exactly when `update(message)(state)` is not rejected
     (`update` is pure, and commands only describe effects), so the model and `update` cannot disagree. The
     model may offer *less* than `update` accepts (a UI condition on top, e.g. `Opt.filter`), never more.
   - `Dispatch` only takes `Offered` messages, a brand only `offer.ts` makes, so a view that dispatches
     anything else does not compile (views import `Message` as a type only). A parent view lifts a child's
     dispatch with `mapDispatch(dispatch, wrap)`, passing the `wrap` the child is embedded with: that keeps
     the message offered, and the types cannot check it.
   - What the user types or picks is offered with `offerInput(toMessage, current)` (an
     `InputOffer<Value, Message>`). What is typed is never a reason to reject: `update` stores it as is,
     and validity becomes model data (e.g. `submit` not offered).
   - No toggles: a view message never carries a decision taken on the state it was rendered from. Name the
     intent (`MenuOpened` / `MenuClosed`, `ItemSelected` / `ItemDeselected`) and let the model offer
     whichever is accepted (`Opt.orElse(offer(ItemSelected), () => offer(ItemDeselected))`). `update`
     rejects a view message that would change nothing instead of accepting it as a no-op, since "accepted"
     is all the model can see.
   - The engine numbers states (revisions) and remembers which revision every view message comes from. A
     message rejected for the *current* revision is a bug (the model offered it), so the engine dies with
     `RejectedMessage`; one rejected for an *older* revision (an outdated frame, a double tap), or coming
     from a command or subscription, is stale and ignored. This is why a double tap is harmless: the second
     message is rejected. Snabbdom hooks must not dispatch messages `update` may reject.
5. **State.** A single global state for everything, UI and logic: no local view state, no mutable
   refs/singletons outside it. `State` (everything the program needs) ≠ `Model` (the projection the view
   needs, with its offers), both in pages and in the root. Model the state as explicit, independent state
   machines (one per concern: data, selection, form, …) rather than shared flags. Never store derived data:
   values that depend on time (expiration status, …) are computed in `makeModel` from a `now` kept in the
   state by a clock subscription. Asynchronous operations get an id from the state (`nextOperation`), the
   state remembers the operation in progress (e.g. `Deleting { operation }`), and the completion carries
   the id back: `update` applies it only if it matches, and rejects it otherwise.
6. **Pages.** Each page in `src/app/pages/<page>/` is a module whose public API is the files at its root;
   **every subfolder is private** (biome `noRestrictedImports`), and files inside import each other
   relatively.
   - Public: `program.ts` (the `Program`, `State`, `Model`, `Deps`, and the page's contract:
     `ExternalMessage`, what the parent may send, e.g. `BackPressed`, exported with its constructors;
     `Event`, what the page asks of its parent; `Message`, exported as a type only, so nothing outside the
     page can forge a click or a completion); `view.tsx`; and one `*.layer.ts` per setup (`sqlite.layer.ts`,
     `in-memory.layer.ts`, …), named after *what* backs the ports, never after an environment. They are
     separate files so that the view bundles on its own for hot reload and each setup pulls in only its
     own dependencies.
   - Private: `program/` (`messages.ts`, `state.ts`, `model.ts`, `update.ts`, `subs.ts`, `commands.ts`),
     `domain/` (what only this page uses), `ports/<capability>.ts` and
     `adapters/<capability>/<implementation>.ts` (each exporting a `layer`, composed by the `*.layer.ts`
     files, never several setups in one file).
   - A page never acts on its parent: it returns *events* (Elm's "OutMsg", e.g. `InfoRequested`,
     `LeaveRequested`), handled by the parent in `embed`'s `onEvent`, which the types require whenever the
     child has events.
7. **Root in `src/app/`**, structured like a page one level up. Code outside `src/app` imports only its
   root files (`program.ts`, `view.tsx`, `*.layer.ts`); the root reaches a page only through the page's
   public files.
   - `domain/`, `ports/`, `adapters/`: what every page shares, so pages never copy or reach into each
     other: the entities (e.g. `Product`, its `Snapshot`, validation and derived functions), the root's
     own ports (`Shell`) and the write ports (`ProductCommands`), with their adapters, provided once by the
     root `*.layer.ts` files. At every level a page imports the `domain/` and `ports/` above it, never
     their `adapters/`, and the root's `domain/`, `ports/` and `adapters/` never import a page (biome).
   - Navigation (`program/navigation.ts`): pages are lifted with `embed` (e.g. `GotHomeMsg`, subscription
     keys prefixed by the page name) into a stack of page states, the last one shown, changed only when a
     page emits an event. Android's back button (`Shell`) reaches the shown page as `BackPressed`, which
     closes what is open or asks to be left; leaving the last page exits the app. A page is found anywhere
     in the stack, so a hidden page still receives its completions, but its subscriptions run only while it
     is on top (`embed`'s `getSubscribed`): the window and its scrolling belong to the shown page. A page
     shown again resubscribes, and its streams emit at once (`changes`, `Stream.tick`).
8. **Ports, adapters and storage.** A port (`Context.Service`) groups one capability's *commands*
   (Effects / `RequestResolver`s) and *events* (Streams), in domain data, never page messages: `subs.ts`
   and `commands.ts` turn them into messages.
   - Reads and writes are separate. Write ports belong to the app (`ProductCommands`: `add`, `deleteById`)
     and have no read. Each page owns its query ports and read models, shaped for what it shows (Home's
     `ProductList`, sorted by expiration): two pages with two queries ask two questions, which is not
     duplication. A page learns about writes from the storage, not from the writing page: `sql.reactive`
     and the in-memory store's `SubscriptionRef` re-run its query after every write.
   - Persistence ports take the domain's `Snapshot` (branded: only `toSnapshot` makes one, from a valid
     object) and return `UnvalidatedSnapshot`s, which the page validates with `fromSnapshot`. Adapters never
     read the fields of domain objects.
   - Storage is single: the sqlite database and the in-memory store (`src/infrastructure/in-memory/`, the
     development counterpart, with sample products) are each provided once by the entrypoint, and every
     adapter queries them. Migrations (`src/infrastructure/sql/migrations.ts`) are append-only: a phone has
     already run the existing ones, so a fix is a new migration.
   - Other ports (e.g. `Viewport`, `Notifications`) stay in the page that uses them; when a second page
     needs one, it moves with its adapters to `src/app/ports/` and `src/app/adapters/`.
9. **Entrypoints in `src/entrypoints/`**: the only place that knows about environments.
   `production.ts` (sqlite, bundled view, `Info` logs) and `development.ts` (in memory, hot-reloaded view,
   `Debug` logs) pick a setup and call `run.ts`, which is environment-agnostic and hides the splash screen
   once the first view is displayed and its fonts are loaded (not when data is loaded). `scripts/cli.ts`
   builds only the requested entrypoint, so each bundle contains only what it uses; never branch on
   `process.env.NODE_ENV` in shared code.
10. **`src/infrastructure/`** (`@/infra/*`): what adapters and entrypoints need to reach data and the
    platform (sqlite worker and in-memory layer, sql helper and migrations, in-memory store, renderer, hot
    module loader, css refresher, splash screen, fonts).
11. **`src/libs/`** (`@/libs/*`): generic code with no knowledge of the app, one folder per module (files of
    a module import each other relatively, other modules through the alias):
    - `elm/` — engine, `Program`/`embed`, offers (`Offered`, `offers`), view types. It knows nothing of
      snabbdom (biome);
    - `elm-snabbdom/` — the bridge: `View<Model, Message>` over `VNode`, and `handlers`;
    - `jsx/` — the JSX runtime for views;
    - `numbers/` (`Integer`, `PositiveInteger`, `UnitInterval`), `collections/` (`NonEmptyHashSet`),
      `strings/` (`NormalizedString`), `ui/` (`cn`), `dynamic-import/` (`saferImport`), `option/` (the
      `Option` arbitrary);
    - `testing/` — test-only: `dispatchedBy` (fires every handler of a rendered view), `applyAll` (applies
      messages to an `update`), the `bun test` preload.

    Branded types expose `fromNumber` (or `make`), returning an `Option`, and `fromNumberUnsafe` (or
    `makeUnsafe`), which throws, only for values that are valid by construction. Export only what another
    module uses, plus the public API a library module is meant to offer.
12. **Runs locally**: the app must run in a local browser, not only on Android.
13. **View hot reload**: `scripts/cli.ts watch` rebuilds and notifies over a WebSocket; `development.ts`
    (through `src/infrastructure/hot-module.ts`) re-imports `src/app/view.tsx`, and `CssRefresher` reloads
    the CSS first. The state survives because it lives in the engine. When moving files, **update the
    paths in `scripts/cli.ts`**.

## Views

- Views are TSX (`view.tsx`, and only views: the dev server swaps the view in place when only `.tsx` or CSS
  files change). TSX compiles with the automatic runtime in `src/libs/jsx/jsx-runtime.ts`
  (`jsxImportSource`), which builds snabbdom vnodes with strict types: an element accepts only the snabbdom
  modules (`key`, `props`, `attrs`, `class`, `style`, `dataset`, `on`, `hook`), and `props` only the
  element's own properties, so a misplaced `<div className='…'>` does not compile (snabbdom's own types
  would silently ignore it). Biome's `a11y/useButtonType` is off for `.tsx`: it looks for a React-style
  `type` attribute, which snabbdom keeps in `props`.
- Offers are attached with `handlers(dispatch)` from `libs/elm-snabbdom`: `on={on('click', model.openMenu)}`,
  `on={onValue('input', form.changeName, inputValue)}`. A handler exists only while its action is offered,
  so views never check `Opt.isSome`. `onPreventingDefault` always attaches: it cancels the browser's default
  (e.g. the menu of a long press) and dispatches only if offered. Several events on one element merge their
  objects: `on={{ ...on('pointerdown', a), ...on('pointerup', b) }}`.
- A large view is split into private components under `view/`, with `view.tsx` as the public facade.

## Code conventions

- `.ts` extension required in imports (biome `useImportExtensions`). Path aliases: `@/app/*`, `@/infra/*`,
  `@/libs/*`, no others.
- Namespace imports for Effect modules (`import * as Effect from 'effect/Effect'`), with the aliases
  `Array → Arr`, `Option → Opt`, `Request → Req`, `Tuple → T`.
- Messages and unions: `Data.TaggedEnum` + `Data.taggedEnum`; match with `Match.tag` / `_tag` checks.
- Services: `class X extends Context.Service<X, Shape>()('<hash>')` with a hashed key (language service
  `default-hashed`), implemented as `Layer`s. Use `Request`/`RequestResolver` where batching helps.
- No `console`, `Date`, `Math.random`, `fetch` or global timers inside Effect: `Effect.log*`,
  `Clock`/`DateTime`, `Random`, platform services.
- `strictBooleanExpressions`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` are on. State and
  model are `Readonly`; values with invariants are branded.
- Lint with biome; format with dprint, only the files you changed (`bunx dprint fmt <files>`): a bare
  `dprint fmt` rewrites generated files, Android resources and untouched code.
- Comments only for what the code cannot say: why, an invariant or contract the types do not show, a
  platform or library behaviour relied upon, a choice that would look like a mistake. Never a repetition of
  a name or type, of what the next line plainly does, or of this file. Update or remove them with the code.
- No blank lines between the statements of a block (function, generator or test body): a part that needs
  separating usually deserves a name. Blank lines separate declarations and units: top-level declarations,
  imports from code, class and type members, entries of a large object (e.g. `update`'s handlers), and
  `describe`/`test` calls.
- Documentation is part of the change: when it affects what `README.md`, `src/README.md` or this file
  describe, update them in the same change, and remove what is no longer true.
- Logging only where effects run (engine, commands, subscriptions, adapters, infrastructure, entrypoints),
  never in `update`, `makeModel` or views:
  - `error`: a bug, right before the app dies (a rejected message from the current view, a defect in a
    command or subscription);
  - `warn`: a handled failure, with its cause, logged where the cause is known (adapters log the
    `SqlError`/`SchemaError` before failing the request);
  - `info`: rare events (storage ready, first view displayed, a product added, hot reload);
  - `debug`: the loop (messages that change the state or run commands, as tags only via `describeMessage`;
    subscriptions started and stopped; commands starting).

  Commands carry `Effect.withLogSpan` and `Effect.annotateLogs({ operation })`, so a completion can be
  matched to its start.

## Tests

- `bun:test` with `fast-check` property tests, in a `*.test.ts` next to the module under test. Properties
  state the *intended* behaviour; one the code does not satisfy yet stays as `test.failing` with the bug in
  its name. Tests may import private files of a page (biome allows it for tests only).
- Every page's `update.test.ts` renders the real view for arbitrary states, fires every handler
  (`dispatchedBy`) and checks that each dispatched message is accepted, does something (typed input
  excepted) and acts once when sent twice: this is what keeps the engine from dying by mistake. Rejections
  are asserted explicitly (`Engine.isRejected`), never as "state unchanged".
- Arbitraries: every branded type and domain type has a `<module>.arbitrary.ts` that only produces valid
  values (domain ones also generate what a storage may return); state arbitraries are in
  `program/state.arbitrary.ts`. Tests build generators from them instead of calling `*Unsafe`.
- Every adapter of a port passes the same contract, since development only exercises the in-memory ones.
  The contract describes the port, so it sits next to it as `<port>.contract.ts`: a function taking the
  adapter's layer, run by each adapter's own `<adapter>.test.ts`, so a failure names the broken adapter.
  A write port has no read, so its contract also takes `readBack`, supplied by each adapter's test from its
  own storage: reads only tests need live in the tests, never in a port. Sqlite setups use
  `src/infrastructure/sqlite/memory.layer.ts` (wa-sqlite and the real migrations, in memory).
- Test-only code (`fast-check`, `*.arbitrary.ts`, `*.contract.ts`, `libs/testing`) can only be imported by
  test-only code (biome), so it never reaches a bundle. Tests that build storages or make the engine die on
  purpose raise `References.MinimumLogLevel`. `bun test` preloads `src/libs/testing/preload.ts`, which
  declares the `window` global snabbdom reads.

## When the app grows

- **Navigation**: with three or four pages, consider an app-level page descriptor (not in `libs/elm`)
  gathering what navigation needs from each page (back message, title, …), instead of growing the
  exhaustive `Match`es in the root.

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

`.env` is created from `.env.default` on the first run and read from disk (`DEV_SERVER_HOST`,
`DEV_SERVER_PORT`). `watch` serves `dist/` and the hot reload socket (`/hot-reload`) on the same port: it
sends `reload-view` when only `.tsx` or CSS files changed (the view is swapped, the state kept), and
`reload-page` otherwise.

## Refactoring status (verify before working)

- The `about` page is a skeleton (licenses and a random saying); some sayings contain `<br />`, shown as
  text.
- Home's view only shows `Valid` products: `Invalid` (stored with an id, but not valid) and `Corrupt` (no
  id) ones are in the model and counted in `total`, but not rendered, so the count can exceed the rows shown
  and an invalid product cannot be selected or deleted from the UI.

When an item in this section is resolved, update this file.
