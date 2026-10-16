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
   `program.ts` (pages and the root expose a `Program`; children are lifted into parents with `embed`),
   `offer.ts` (`Offered`, `Offer`, `offered`: see rule 4) and `view.ts` (views are pure
   `(model, dispatch) => Node` functions, generic over the node the renderer draws, and `dispatch` only takes `Offered` messages). `libs/elm` knows nothing of snabbdom (enforced by biome): views use `View<Model, Message>` from `libs/elm-snabbdom` (the renderer and tests instantiate `View<Model, Message, VNode>`). A page never acts on its parent: it
   returns *events* (the Elm "OutMsg" pattern, e.g. `InfoRequested`, `LeaveRequested`), declared as a public
   `Event` type, and the parent handles them in `embed`'s `onEvent`, which the types require whenever the
   child has events.
4. **Rejection.** When a message makes no sense in the current state, `update` returns `Engine.reject`
   (never a log or a "wrong state" command). The view never builds messages: the model *offers* them, as
   `Offer<Message>` fields (`Option<Offered<Message>>`, from `libs/elm/offer.ts`) named after the action
   (`openMenu`, `deleteSelected`, …). `Dispatch` only takes `Offered` messages, a brand that only `offered`
   makes, so a view that dispatches anything else does not compile (it imports `Message` as a type only).
   `makeModel` decides an offer by asking `update` itself: `offered(update, state)(message)` is
   `Some(message)` exactly when `update(message)(state)` is not rejected (`update` is pure, and its commands
   only describe effects), so the model and `update` cannot disagree by construction. The conditions
   therefore live only in `update` (private helpers when several messages share one). The model may offer
   *less* than `update` accepts (a UI condition on top, e.g. `Opt.filter`), never more. Messages carrying
   what the user types or picks are offered as `InputOffer<Value, Message>` by `offeredInput`, which asks
   with the current value: what is typed is never a reason to reject (`update` stores it as is, and validity
   becomes model data, e.g. `submit` not offered). A parent view lifts a child's dispatch with
   `mapDispatch(dispatch, wrap)`, passing the same `wrap` the child is embedded with: that is what keeps the
   wrapped message offered, and the types cannot check it.
   The engine numbers states (revisions) and
   remembers which revision every view message comes from: a message rejected for the *current* revision means
   the view sent something `update` does not accept — a bug, so the engine dies with `RejectedMessage`; a
   message rejected for an *older* revision (a click on an outdated frame, a double tap), or coming from a
   command or subscription, is stale and ignored. Each page's `update.test.ts` renders the real view for
   arbitrary states, fires every handler and checks that `update` accepts every dispatched message: this is
   what keeps the engine from dying by mistake. Snabbdom hooks must not dispatch messages `update` may reject.

   A view message never carries a decision taken on the state it was rendered from: no toggles. Name the
   intent (`MenuOpened` / `MenuClosed`, `ItemSelected` / `ItemDeselected`), have `update` reject it when
   it does not apply, and let the model offer whichever is accepted (e.g.
   `Opt.orElse(offer(ItemSelected), () => offer(ItemDeselected))`). Only then is a double tap (the same
   message twice from one frame) harmless: the second one is rejected, so it is ignored as stale, whereas a
   toggle accepted twice undoes itself. Since "accepted" is all the model can see, `update` rejects a view
   message that would change nothing (e.g. typing into a form being submitted) instead of accepting it as a
   no-op. Each page's `update.test.ts` checks that every message the view can dispatch does something
   (changes the state, or returns commands or events; typed input excepted) and acts once when sent twice
   (no second change, command or event).

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
   - `view.tsx` — the page view, in TSX (see "Views" below)
   - `sqlite.layer.ts`, `in-memory.layer.ts`, … — one adapter composition (`layer`) per setup, named after
     *what* backs the ports, never after an environment (environments only exist in `src/entrypoints/`)

   They are separate files on purpose: the view is bundled on its own for hot reload, and each setup must
   only pull in its own dependencies. Privately, a page contains:
   - `program/` — the Elm program: `messages.ts` (`ExternalMessage`, `Message`, `Event`), `state.ts`,
     `model.ts` (`Model` + `makeModel`), `update.ts` (`update` + `init`), `subs.ts`, `commands.ts`
   - `domain/` — domain types and logic only this page uses (the app's entities live in `src/app/domain/`,
     see rule 7)
   - `ports/<capability>.ts` — one `Context.Service` per external capability (e.g. `Viewport`,
     `Notifications`), grouping that capability's *commands* (Effects / `RequestResolver`s) and
     *events* (Streams). Stored data has separate read and write ports: the page owns its query ports,
     shaped for what it shows (e.g. Home's `ProductList`, whose `changes` stream re-emits after every
     write), while write ports belong to the app (e.g. `ProductCommands` in `src/app/ports/`, with `add`
     and `deleteById`). Ports speak in domain data, never in page messages: `subs.ts` turns events into
     messages and `commands.ts` turns command results into messages. Persistence ports take the domain's
     `Snapshot` (branded: only `toSnapshot` makes one, so it always comes from a valid object) and return
     `UnvalidatedSnapshot`s, which the page validates with `fromSnapshot`. Adapters never read the fields of
     domain objects: only the domain knows which fields are persistent and which are derived.
   - `adapters/<capability>/<implementation>.ts` (e.g. `product-list/sql.ts`, `product-list/in-memory.ts`), each
     exporting a `layer`, composed by the public `*.layer.ts` files (never several setups in the same
     file, so a bundle only includes the implementations it uses)
7. **Root in `src/app/`**: structured exactly like a page, one level up. Public files at its root
   (`program.ts`, `view.tsx`, `sqlite.layer.ts`, `in-memory.layer.ts`) are the only things code outside
   `src/app` may import; `program/`, `domain/`, `ports/`, `adapters/` and `pages/` are private (enforced
   by biome).
   Inside `src/app` files use relative imports, and the root reaches each page only through the page's
   public files. Pages are **lifted into the root** with `embed` (e.g. `GotHomeMsg`, subscription keys
   prefixed by the page name). The root owns navigation: a stack of page states (the last one is shown),
   changed only when a page emits an event; Android's back button (`Shell` port) is forwarded to the shown
   page as `BackPressed`, which closes what it has open or asks to be left, and leaving the last page exits
   the app. A page is found wherever it is in the stack, so hidden pages still receive their completions;
   its subscriptions, though, only run while it is on top (`embed`'s `getSubscribed`), since the window and
   its scrolling belong to the shown page. A page shown again resubscribes, and its streams emit at once
   (`changes`, `Stream.tick`), so it is up to date on its first frame.
   The stack helpers, the page embeds and the reactions to page events live in `program/navigation.ts`;
   `program/state.ts` only holds the types. The root `*.layer.ts` files merge the root adapters with the
   matching page setups.

   The root's `domain/`, `ports/` and `adapters/` hold what must be the same for every page, so pages
   never copy or reach into each other:
   - `domain/` — the app's entities (e.g. `Product`), their `Snapshot`, validation rules and derived
     functions (e.g. the expiration status computed from `now`), with their arbitraries and tests;
   - `ports/` — the root's own ports (e.g. `Shell`) and the write ports (e.g. `ProductCommands`): every
     page changes stored data through the same commands;
   - `adapters/<capability>/<implementation>.ts` — their implementations, provided once by the root
     `*.layer.ts` files.

   The rule is the same at every level: a page imports the `domain/` and `ports/` of the levels above it
   (relative paths), never their `adapters/`; the root's `domain/`, `ports/` and `adapters/` never
   import a page (both enforced by biome). Reads stay in the pages: each page has its own query
   ports and read models, built for what it shows (e.g. Home's products sorted by expiration), carrying
   the fields the app's domain functions need. Two pages with two query ports ask two different
   questions: that is not duplication. A page learns about writes from the storage, not from the writing
   page: `sql.reactive` and the in-memory store's `SubscriptionRef` re-run its query after every write,
   and the page turns that stream into a message in its `subscriptions`.
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
     Available actions are offers carrying the message to dispatch (e.g. `deleteSelected: Offer<Message>`, `None`
     when `update` would reject it), so the view makes no logic decisions (see rule 4).
10. **`src/infrastructure/`** (alias `@/infra/*`): everything adapters and entrypoints need to reach data
   and the platform (sqlite/wasm worker, sql helper and migrations, the in-memory store, snabbdom renderer,
   hot module loader, css refresher, …). Pages depend on their own ports; page adapters use the
   infrastructure. Storage is single: the sqlite database and the in-memory store
   (`in-memory/store.ts`, the development counterpart of the database, with seed data) are each provided
   once by the entrypoint, and every adapter queries them, so what one adapter writes the others read.
11. **`src/libs/`** (alias `@/libs/*`): generic code only, with no knowledge of the app domain. Organized
    in one folder per module; files of the same module import each other relatively, other modules via the
    alias:
    - `elm/` — engine, program composition, offers (`Offered` brand), view types
    - `numbers/` — branded `Integer`, `PositiveInteger`, `UnitInterval` (each module may have a
      `*.arbitrary.ts` companion for tests)
    - `collections/` — `NonEmptyHashSet`, and an arbitrary for non-empty arrays
    - `strings/` — `NormalizedString`
    - `ui/` — `cn` (clsx + tailwind-merge)
    - `dynamic-import/` — `saferImport`
    - `option/` — the `Option` arbitrary (`maybe` in tests)
    - `jsx/` — the JSX runtime for views (`jsx-runtime.ts`, see "Views")
    - `elm-snabbdom/` — the bridge between `elm` and snabbdom: the `View` alias over `VNode`, and `handlers`
    - `testing/` — test-only helpers: `view.ts` (`dispatchedBy`, which fires every handler of a rendered
      view) and the `bun test` preload

    Branded types expose `fromNumber` (or `make`), returning an `Option`, and `fromNumberUnsafe` (or
    `makeUnsafe`), which throws: the latter only for values that are valid by construction. Export only what
    another module uses, plus the public API a library module is meant to offer.
12. **Runs locally**: the app must be runnable in a local browser (not only on Android).
13. **View hot reload**: in dev, `scripts/cli.ts watch` rebuilds and notifies over WebSocket; the
    development entrypoint (`src/entrypoints/development.ts`, via `src/infrastructure/hot-module.ts`)
    re-imports the root view module (`src/app/view.tsx`) and `CssRefresher` reloads the CSS. Global state
    survives the reload because it lives in the engine, not in the view. When moving files,
    **update the paths in `scripts/cli.ts`** (entrypoints, view entrypoint and watched folders).

## When the app grows

- **Large views**: split a page view into private components under `view/` (e.g. `view/product-list.ts`),
  keeping `view.tsx` as the public facade, like `program.ts` and `program/`. Hot reload still works: it
  reloads the root view with everything it imports.
- **A new page reading stored data**: it adds its own query port and adapters over the same database
  and in-memory store (rule 10), never a private copy, and uses the app's domain and write ports
  (rule 7). Other ports (e.g. `Viewport`, `Notifications`) stay in the page that uses them until a second
  page needs them; then they move, with their adapters, to `src/app/ports/` and `src/app/adapters/`.
- **Navigation**: with three or four pages, consider an app-level page descriptor (not in `libs/elm`)
  gathering what navigation needs from each page (back message, title, …), instead of growing the
  exhaustive `Match`es in the root.

## Code conventions

- Views are TSX (`view.tsx`, and only views: `scripts/cli.ts` reloads the view in place when only `.tsx` or
  CSS files change). TSX compiles with the automatic runtime from `src/libs/jsx/jsx-runtime.ts`
  (`jsxImportSource` in `tsconfig.json`), so views import nothing for it. It builds snabbdom vnodes with
  snabbdom's own `jsx`, but with strict types: an element only accepts the snabbdom modules (`key`,
  `props`, `attrs`, `class`, `style`, `dataset`, `on`, `hook`), and `props` only the element's own
  properties, so `<div props={{ className: '…' }} on={{ click: … }}>` compiles and a misplaced
  `<div className='…'>` does not (snabbdom's types would accept and silently ignore it). Biome's
  `a11y/useButtonType` is off for `.tsx` files: it looks for a React-style `type` attribute, which
  snabbdom keeps in `props`.
- Views attach the model's offers with `handlers(dispatch)` from `libs/elm-snabbdom`:
  `on={on('click', model.openMenu)}`, `on={onValue('input', form.changeName, inputValue)}`. The handler
  exists only while the action is offered, so a view never wraps `dispatch` in `Opt.isSome` checks.
  `onPreventingDefault` is the exception that always attaches: it cancels the browser's default (e.g. the
  native menu of a long press) and dispatches only if the action is offered. Several events on one element
  merge their objects: `on={{ ...on('pointerdown', a), ...on('pointerup', b) }}`.

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
- Linting: biome (formatter disabled); formatting with dprint. Run dprint on the files you changed
  (`bunx dprint fmt <files>`), not on the whole project: a bare `dprint fmt` also rewrites generated files,
  Android resources and code nobody touched.
- Documentation is part of the change: when a change affects what `README.md` (overview, status, commands,
  architecture, tests), `src/README.md` (source map, reading order) or this file describe, update them in
  the same change, and remove what is no longer true.
- Comments only for what the code cannot say: why something is done this way, an invariant or a contract
  that is not visible in the types, a behaviour of a library or platform the code relies on, a choice that
  would look like a mistake. No comments that repeat a name or a type, describe what the next line
  plainly does, or restate what this file documents (e.g. that a page's subfolders are private). When code
  changes, update or remove the comments about it.
- No blank lines between the statements of a block (a function body, a generator, a test body): a block
  reads top to bottom, and a part that needs separating usually deserves a name of its own. Blank lines
  stay where they separate declarations or units: top-level declarations, imports from code, class
  members, type members, the entries of a large object (e.g. the handlers of an `update`), and `describe`
  or `test` calls.
- Tests: `bun:test` with `fast-check` property tests, in a `*.test.ts` file next to the module under test
  (e.g. `pages/home/program/update.test.ts`). Properties state the *intended* behaviour; when the code
  does not satisfy one yet, keep it as `test.failing` with the bug in its name, so the suite stays green and
  flags the fix.
- Every page's `update.test.ts` checks that the view and `update` agree (rule 4): it renders the real view
  for arbitrary states, fires every event handler (`dispatchedBy` from `src/libs/testing/view.ts`) and
  asserts `update` accepts what they dispatch. Rejections
  are asserted explicitly (`Engine.isRejected`), never as "state unchanged". `bun test` preloads
  `src/libs/testing/preload.ts` (see `bunfig.toml`), which declares the `window` global snabbdom reads.
- Tests may import a page's private files (biome allows it for `*.test.ts` only): a test drives a page
  the way its own view and subscriptions would, e.g. the root tests build Home's `Message`s.
- Arbitraries: every branded type in `src/libs/` has a companion `<module>.arbitrary.ts` (e.g.
  `numbers/positive-integer.arbitrary.ts`) exporting a fast-check `arbitrary` that only produces valid values.
  Tests build their generators from these instead of calling `*Unsafe` constructors. `fast-check` and
  `*.arbitrary.ts` may only be imported by `*.test.ts` and `*.arbitrary.ts` files (biome), so production
  bundles never include them. When adding a branded type, add its arbitrary too. The same goes for domain
  types in `src/app` (e.g. `domain/product.arbitrary.ts`: valid products, the snapshots `fromSnapshot` accepts,
  and anything a storage may return). State arbitraries live in `program/state.arbitrary.ts`.
- All the adapters of a port pass the same contract: development only exercises the in-memory adapters, so
  nothing else would notice a production (sqlite) adapter that behaves differently. The contract describes the
  port and holds no implementation, so it sits next to the port as `<port>.contract.ts` (e.g.
  `app/ports/product-commands.contract.ts`, `pages/home/ports/product-list.contract.ts`): a function taking
  the adapter's layer. Each adapter has its own `<adapter>.test.ts` next to it that runs the contract with
  that layer, so a failure names the broken adapter. `*.contract.ts` files are test-only code (biome).
  Sqlite setups use `src/infrastructure/sqlite/memory.layer.ts`: the production engine (wa-sqlite) and
  migrations, in memory. A write port has no read (pages read through their own query ports), so its
  contract also takes `readBack`: each adapter's test supplies one that looks into that adapter's own storage
  (e.g. the in-memory store's rows, or `SqlHelper.getProducts`). Reads that only tests need live in the tests,
  never in a port.
- Migrations (`src/infrastructure/sql/migrations.ts`) are append-only: a database on a phone has already run
  the existing ones, so a fix is a new migration, never an edit of an old one.

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
same port: it sends `reload-view` when only `.tsx` files (the views) or CSS changed (the view is swapped, the state
kept) and `reload-page` otherwise.

## Refactoring status (verify before working)

Some parts are still inconsistent:

- the `about` page is a skeleton (licenses and a random saying); some sayings contain `<br />`, shown as
  text;
- Home's view only shows `Valid` products: `Invalid` ones (stored with an id, but not a valid product)
  and `Corrupt` ones (no id) are in the model, and counted in `total`, but not rendered, so the item count
  can exceed the rows shown and an invalid product cannot be selected or deleted from the UI.

When an item in this section is resolved, update this file.
