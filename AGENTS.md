# Fridgy — guide for coding agents

What the app is, its architecture and its commands are in [`README.md`](README.md); the source tree is
mapped in [`src/README.md`](src/README.md). This file holds the rules for working on it. The app is NOT
working yet and is in the middle of a refactoring (see "Refactoring status").

## Language

All code, comments, identifiers, commit messages and `.md` files are in **English**. Chat with the user may
be in Italian.

## Tooling enforces a lot

Biome and the typecheck enforce import boundaries (private folders of the app and of pages, test-only code (including
`@fgaudo/effect-tea/testing`) kept out of bundles), the strict typing of views (`dispatch` only
takes offered messages; JSX elements only accept snabbdom's modules) and the language service rules (no
`console`, `Date`, `Math.random`, `fetch` or timers inside Effect; hashed service keys). When one of them
reports an error, the rule is intended: fix the code, do not work around the check.

## Architecture rules

The pages to copy are `src/app/pages/home` (full) and `src/app/pages/about` (minimal).

- **Expected errors are typed, bugs crash.** Expected failures go through Effect's error channel
  (`Effect.tryPromise`/`Effect.try`, no `try/catch`, no bare Promises). A violated invariant is a defect
  (`Effect.die`): never silenced, retried or turned into a message. Commands turn expected failures into
  messages with `Tea.attempt` (in a subscription, `emit` a message for the failure); `run`'s `onBug` may report a
  crash, never recover from it.
- **A port says in its type how its data ends.** One value is an `Effect<A, E>`. Values over time are a
  `Source<A, Done, E>` (`libs/source`, an Effect `Channel`): `Done` is what it ends with, e.g. the file of a
  download, and `never` for a source that never ends (database changes, scrolling, the back button). A
  `Tea.Subscription` is the same kind of channel, so a page subscribes by mapping a port's
  `Source<A, never>` into messages (`Channel.unwrap` to read the service, `Channel.map`); a finished process
  turns its `Done` into a message. An adapter built on a library's stream wraps it with `Source.fromStream`,
  which keeps listening once the stream has ended. Only on-going observation is a `Source`: a one-off read is
  an `Effect`.
- **Effects only in commands and subscriptions.** `update`, `makeModel` and views are pure; one global state,
  no local view state or mutable singletons.
- **The model offers, `update` decides.** Conditions live only in `update`, which returns `Engine.reject`
  when a message does not apply. `makeModel` builds each action with `offers(update, state)`, so what the
  view can send is exactly what `update` accepts (it may offer less, never more). A message that `update`
  rejects even in the state of the frame that sent it is a bug, and the engine dies (`onRejected: 'die'`);
  one the frame's state accepted is stale and ignored.
- **No toggles; one-shot actions guard themselves.** A view message names an intent
  (`MenuOpened`/`MenuClosed`), so sending it twice does what it did once, while a toggle accepted twice
  undoes itself. An action that must happen once (submitting, deleting, navigating) moves to a state that
  rejects it, so a double tap, or a tap on a view that has not caught up yet, is ignored as stale. Actions
  meant to repeat stay accepted. Rejecting a message that would change nothing is a choice, not a rule: do
  it when the view should hide or disable the control.
- **What is typed is never a reason to reject.** Input is stored as typed (offered with `offerInput`), and
  validity becomes model data (e.g. `submit` not offered).
- **State machines, no derived data.** One explicit state machine per concern (data, selection, form)
  instead of shared flags. Values that depend on time are computed in `makeModel` from a `now` that a clock
  subscription keeps in the state.
- **An asynchronous operation is a state that waits for its completion** (`Submitting`, `Deleting`): only
  the completion leaves it, and `update` rejects the completion in any other state. Commands cannot be
  cancelled, so a completion always belongs to the operation in progress. Give operations an id only when one
  can be abandoned or overlap with another of its kind.
- **Pages talk to their parent through events** (`Event`, handled by `embed`'s `onEvent`), never by acting
  on it. A page exports its `Message` as a type only, so nothing outside it can forge one. Hidden pages keep
  receiving their completions, but their subscriptions run only while they are on top.
- **Reads in the pages, writes in the app.** Write ports (`app/ports`, e.g. `ProductCommands`) have no read.
  Each page has its own query ports, shaped for what it shows; it learns about writes from the storage's
  changes (a `Source`), not from the page that wrote. Persistence ports take a domain `Snapshot` and return
  `UnvalidatedSnapshot`s; adapters never read domain fields.
- **Shared things move up, never sideways.** What several pages need (entities, write ports, a port a second
  page wants) moves to `src/app/domain`, `ports`, `adapters`; pages never import each other.
- **One storage per setup**, provided once by the entrypoint (sqlite in production, the in-memory store in
  development), queried by every adapter.
- **Migrations are append-only**: a phone has already run the existing ones, so a fix is a new migration.
- **Environments exist only in `src/entrypoints/`.** Shared code never branches on `process.env.NODE_ENV`;
  each setup has its own `*.layer.ts`, named after what backs it (`sqlite`, `in-memory`), so a bundle only
  contains what it uses. When moving files, update the paths in `scripts/cli.ts`.
- **The runtime of the Elm architecture is a library**: [`@fgaudo/effect-tea`](https://www.npmjs.com/package/@fgaudo/effect-tea),
  an npm dependency developed in its own repository (`github.com/fgaudo/effect-tea`), documented in its
  README. The app imports `import * as Tea from '@fgaudo/effect-tea'`, and its tests
  `@fgaudo/effect-tea/testing`. Never patch it from here: a change to the library is made, released and
  then upgraded to in this app.
- **`src/libs/` is generic**: no knowledge of the app. A branded type with a rule is defined once, as a
  `Schema` (`Schema.Int.pipe(Schema.brand(…))`, `.check(…)` for the rule), and its type, `make` (an
  `Option`) and `makeUnsafe` (only for values valid by construction) are derived from it; `Brand.make` only
  for a generic type, `Brand.nominal` for a brand without a rule. `make` checks a value of the base type as it
  is; a constructor that converts it first is named after its input (`NormalizedString.fromString`
  normalizes). Export only what is used, plus a library module's intended API.

## Views

TSX (`view.tsx`, and only views), rendered by snabbdom. Attach offers with `handlers(dispatch)` from
`libs/tea-snabbdom` (`on={on('click', model.openMenu)}`): a handler exists only while its action is offered.
`onPreventingDefault` is the exception that always attaches (e.g. the native menu of a long press). Split a
large view into private components under `view/`.

## Tests

- `bun:test` and fast-check property tests, in a `*.test.ts` next to the module. A property the code does
  not satisfy yet stays as `test.failing` with the bug in its name.
- Code used only by tests lives in `*.test_<kind>.ts` files (`test_arbitrary`, `test_contract`,
  `test_support`): Biome lets only `*.test.ts` and other `*.test_*.ts` files import them, and `bun test`
  does not run them.
- Every page's `update.test.ts` renders the real view for arbitrary states and checks, with
  `dispatchViolations` (`@fgaudo/effect-tea/testing`), that each message it can send is accepted, and acts
  once when sent twice unless it is listed as repeatable. Assert rejections with
  `Engine.isRejected`, never as "state unchanged".
- Branded and domain types have a `*.test_arbitrary.ts` file producing only valid values; build generators from them,
  not from `*Unsafe` constructors.
- Every adapter of a port passes one contract (`<port>.test_contract.ts`, next to the port), run by the
  adapter's own `<adapter>.test.ts`: development only exercises the in-memory adapters, so nothing else
  catches a production one that behaves differently. A write port's contract takes `readBack` from each
  adapter's test: reads that only tests need never go into a port.

## Conventions

- Effect modules as namespaces (`import * as Effect from 'effect/Effect'`), with `Arr`, `Opt`, `Req`, `T`
  for `Array`, `Option`, `Request`, `Tuple`. Unions with `Data.TaggedEnum`, matched with `Match`.
- Format only the files you changed (`bunx dprint fmt <files>`): a bare `dprint fmt` rewrites generated
  files, Android resources and untouched code.
- Comments only for what the code cannot say: a reason, an invariant the types do not show, a platform
  behaviour relied upon, a choice that would look like a mistake. Never a repetition of names, of the next
  line or of this file.
- No blank lines between the statements of a block; blank lines separate declarations, object entries of
  large tables (e.g. `update`'s handlers) and `describe`/`test` calls.
- Logging only where effects run: `error` for a bug right before the app dies, `warn` for a handled failure
  with its cause (logged where the cause is known), `info` for rare events, `debug` for the program's loop.
  Commands carry `Effect.withLogSpan`.
- Documentation is part of the change: update `README.md`, `src/README.md` and this file when what they
  describe changes, and remove what is no longer true.

## Refactoring status (verify before working)

- The `about` page is a skeleton (licenses and a random saying); some sayings contain `<br />`, shown as
  text.
- Home's view only shows `Valid` products: `Invalid` and `Corrupt` ones are in the model and counted in
  `total`, but not rendered, so the count can exceed the rows shown and an invalid product cannot be
  selected or deleted from the UI.

When an item is resolved, update this section.
