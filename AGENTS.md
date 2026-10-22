# Fridgy — guide for coding agents

What the app is, its architecture and its commands are in [`README.md`](README.md); the source tree is
mapped in [`src/README.md`](src/README.md). This file holds the rules for working on it. The app is NOT
working yet and is in the middle of a refactoring (see "Refactoring status").

## Language

All code, comments, identifiers, commit messages and `.md` files are in **English**. Chat with the user may
be in Italian.

## Commits

A commit made with an AI agent ends with an `Assisted-by: <model>` trailer (e.g. `Assisted-by: Claude Opus 5.5`),
never `Co-Authored-By`: the author is the person who commits. A clear subject is usually enough: a body only says
why, or what the diff and the docs do not, never what they already describe.

## Tooling enforces a lot

Biome and the typecheck enforce import boundaries (private folders of the app and of pages, pages never importing
each other or the app's adapters, relative imports kept short, test-only code (including
`@fgaudo/effect-tea/testing`) kept out of bundles), the strict typing of views (`dispatch` only
takes offered messages; JSX elements only accept snabbdom's modules) and the language service rules (no
`console`, `Date`, `Math.random`, `fetch` or timers inside Effect; hashed service keys). When one of them
reports an error, the rule is intended: fix the code, do not work around the check.

## Architecture rules

The pages to copy are `src/app/pages/home` (a page made of parts) and `src/app/pages/about` (a page in one
module).

The runtime of the Elm architecture is [`@fgaudo/effect-tea`](https://www.npmjs.com/package/@fgaudo/effect-tea),
an npm dependency developed in its own repository (`github.com/fgaudo/effect-tea`). Read its README
(`node_modules/@fgaudo/effect-tea/README.md`) before changing a program: the rules in its "Concepts" (intents
instead of toggles, one-shot actions moving to a state that rejects them, input never a reason to reject, an
operation as a state that only its completion leaves, stale or bug rejections) are rules of this app too, and
are not repeated here. The app imports `import * as Tea from '@fgaudo/effect-tea'`, and its tests
`@fgaudo/effect-tea/testing`. Never patch it from here: a change to the library is made, released and then
upgraded to in this app.

- **Expected errors are typed, bugs crash.** Expected failures go through Effect's error channel
  (`Effect.tryPromise`/`Effect.try`, no `try/catch`, no bare Promises). A violated invariant is a defect
  (`Effect.die`): never silenced, retried or turned into a message. Commands turn expected failures into
  messages with `Tea.attempt`, subscriptions with a message of their own. A defect ends the run: crash reporting goes
  around `run` (`Effect.tapCause`), never recovers from it.
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
- **The model offers, `update` decides.** `update` returns `Tea.reject` when a message does not apply.
  The model's shape says which actions exist: a union with a case per state the view distinguishes, each
  holding only its actions, made with the `offer`/`offerInput` that `makeModel` receives. Each offer is
  checked against `update` as the model is made, so a case that promises a rejected action crashes at once;
  never probe offers to pick a case. The app runs with `onRejectedInput: 'die'`.
- **State machines, no derived data.** One explicit state machine per concern (data, selection, form)
  instead of shared flags. Values that depend on time are computed in `makeModel` from a `now` that a clock
  subscription keeps in the state.
- **A program is split by concern, never by kind.** A program lives in one module until it is too large
  (300–400 lines); then it splits into **parts** (`pages/<page>/parts/`), each a `Tea.Program` with its own
  state, messages, commands and model, declared as a child of the page as the root declares the pages. What spans the
  parts (the menu, the back button, a toast for a part's failure) stays in the page's `program.ts`. Parts
  that read each other's state are one part. A part's view sits next to it (`<part>.view.tsx`), with its
  tests and arbitraries. Never split a program into `messages`/`state`/`update` files: they would import
  each other in cycles.
- **Children are declared, never wired.** A parent (`Tea.parent<{ state; command?; event?; external? }>()`)
  declares each child with `child` (`get`, `set`, `subscribed`); the library routes their messages
  (`{ _tag: <child>, message }`), commands, subscriptions and models. A parent decides whether a child is
  there only with `get`, never by rejecting its messages. A child is started with `children.<Child>.init`,
  in `init` as in `onEvent`, and its `commands` go out with the parent's: reading its program's `init.state`
  would leave them behind. One `dispatch` serves every level: a parent's view
  passes it to its children's views as it is, and a view whose model rarely changes is drawn with snabbdom's
  `thunk` (e.g. Home's product list).
- **Pages talk to their parent through events** (`Event`, handled by the parent's `onEvent`), never by
  acting on it. A program exports its `Message`, `Event` and `Command` as types only (a parent's with
  `Tea.MessageOf` and `Tea.CommandOf`), and its `ExternalMessage` (what its parent may give it with
  `children.<Child>.update`, e.g. `BackPressed`) as a value; tests build their own constructors with
  `Data.taggedEnum<Message>()`. Hidden pages keep receiving their completions, but their subscriptions run
  only while they are on top.
- **Reads in the pages, writes in the app.** Write ports (`app/ports`, e.g. `ProductCommands`) have no read.
  Each page has its own query ports, shaped for what it shows; it learns about writes from the storage's
  changes (a `Source`), not from the page that wrote. Persistence ports take a domain `Snapshot` and return
  `UnvalidatedSnapshot`s; adapters never read domain fields.
- **The domain decides what an entity is.** A new one is made with its `make` (e.g. `Product.make`), and
  a form offers to submit only what `make` accepts, asking the domain's own rules (`Product.make`,
  `Product.canExpireOn`) rather than repeating them; the command then carries the entity, valid by
  construction. `fromSnapshot` only reads stored data, and is more forgiving, so that what was stored can
  still be shown and deleted.
- **Shared things move up, never sideways.** What several pages need (entities, write ports, a port a second
  page wants, a query a second page reads in the same shape) moves to `src/app/domain`, `ports`, `adapters`;
  pages never import each other.
- **One storage per setup**, provided once by the entrypoint (sqlite in production, the in-memory store in
  development), queried by every adapter.
- **Migrations are append-only**: a phone has already run the existing ones, so a fix is a new migration.
- **Environments exist only in `src/entrypoints/`.** Shared code never branches on `process.env.NODE_ENV`;
  each setup has its own `*.layer.ts`, named after what backs it (`sqlite`, `in-memory`), so a bundle only
  contains what it uses. When moving files, update the paths in `scripts/cli.ts`.
- **`src/libs/` is generic**: no knowledge of the app. A branded type with a rule is defined once, as a
  `Schema` (`Schema.Int.pipe(Schema.brand(…))`, `.check(…)` for the rule), and its type, `make` (an
  `Option`) and `makeUnsafe` (only for values valid by construction) are derived from it; `Brand.make` only
  for a generic type, `Brand.nominal` for a brand without a rule. `make` checks a value of the base type as it
  is; a constructor that converts it first is named after its input (`NormalizedString.fromString`
  normalizes). Export only what is used, plus a library module's intended API.

## Views

TSX (`view.tsx`, `<part>.view.tsx`, and only views), rendered by snabbdom. Attach offers with `handlers(dispatch)` from
`libs/tea-snabbdom`, matching the model's case: `on={menu._tag === 'Closed' ? on('click', menu.open) : {}}`.
`onPreventingDefault` is the exception that always attaches (e.g. the native menu of a long press), with an
optional offer. An input the user types into gets its text with `initialValue` (written only when the input
is created), never from `props.value`: a frame older than the last keys would take them back. A large view
splits along the parts; components that know nothing of the app (e.g. `libs/ui/overlay.tsx`) go to
`libs/ui/`. The development server swaps the view in place when only `.tsx` and `.css` files change,
wherever they are, and reloads the page otherwise.

## Tests

- `bun:test` and fast-check property tests, in a `*.test.ts` next to the module. A property the code does
  not satisfy yet stays as `test.failing` with the bug in its name.
- Code used only by tests lives in `*.test_<kind>.ts` files (`test_arbitrary`, `test_contract`,
  `test_support`): Biome lets only `*.test.ts` and other `*.test_*.ts` files import them, and `bun test`
  does not run them.
- Every page's `program.test.ts` renders the real view for arbitrary states and checks, with
  `dispatchViolations` (`@fgaudo/effect-tea/testing`), that each message it can send is accepted, and acts
  once when sent twice unless it is listed as repeatable, and, with `missingOffers`, that nothing the user
  could ask for and `update` accepts is missing from it, but what is `withheld` on purpose. Models in tests
  come from `Tea.modelOf(program)`. A part's `update` has its own tests (`parts/<part>.test.ts`). The root's
  tests act like a user (`app/user.test_support.ts`), with `rehearse`: each action is taken from what the
  shown page's model offers, a subscription's message is heard when the test says so, and commands run on the
  app's in-memory layer when the test runs them, none left pending. What a program listens to comes from
  `Tea.subscriptionsOf(program)`. Generic helpers (`outcomesOf`, `onlyChanged`,
  `assertProperty`) are in `libs/testing/`. Assert commands by value, rejections with `Tea.isRejected`, never
  as "state unchanged".
- Branded and domain types have a `*.test_arbitrary.ts` file producing only valid values; build generators from them,
  not from `*Unsafe` constructors.
- Every adapter of a port passes one contract (`<port>.test_contract.ts`, next to the port), run by the
  adapter's own `<adapter>.test.ts`: development only exercises the in-memory adapters, so nothing else
  catches a production one that behaves differently. A write port's contract takes `readBack` from each
  adapter's test: reads that only tests need never go into a port.

## Conventions

- Imports: relative within a part of the project (a page, a folder of `src/app`, a module of `libs/`), at most
  `../../`; another part through its alias, from the `imports` of `package.json` (`#app/…`, `#libs/…`,
  `#infrastructure/…`), never through `tsconfig` paths.
- Effect modules as namespaces (`import * as Effect from 'effect/Effect'`), with `Arr`, `Opt`, `Req`, `T`
  for `Array`, `Option`, `Request`, `Tuple`. Unions with `Data.TaggedEnum`, matched with `Match`.
- A function that returns an effect made with `Effect.gen` is an `Effect.fn('Name')` instead, with what would
  follow it in a `pipe` as its further arguments; `Effect.fnUntraced` where it runs often (on every frame, in a
  loop). An effect that takes no arguments (a layer, a migration) stays an `Effect.gen`.
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
