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

## Supported Android versions

Only what can be tested is supported. `minSdkVersion` is the lowest Android version that meets the rules in
`README.md` ("Build the Android app"); a change of it, of those rules or of `minWebViewVersion` (which can move
the lowest version that meets them) is checked in the emulator first, and the README changes with it. The target
SDK, the compile SDK, the Android Gradle Plugin and Gradle follow Capacitor's Android template: they move only
with an upgrade of Capacitor, checked in the emulator on the new target.

## Tooling enforces a lot

Biome enforces import boundaries, by the role a file's name gives it:

- inside `src/app`, imports go downwards only: a program knows its own folder (its services, its children),
  never a parent or a sibling (another page, part or service), and the root reaches a page only through the page's
  `program.ts`, `view.tsx`, `layer.ts`;
- adapters (`<service>.<backing>.ts`) are imported only by a `layer.ts`, an entrypoint or their own test: a
  program uses its services;
- an entrypoint imports from `src/app` its root modules and the adapters it picks, nothing else;
- the domain imports only `libs/`; the infrastructure never imports the app; `libs/` knows nothing of the app;
- test-only code (including `@fgaudo/effect-tea/testing`) stays out of bundles, and relative imports stay short.

The typecheck enforces the strict typing of views (`dispatch` only takes the program's own messages; JSX
elements only accept snabbdom's modules) and the language service rules (no `console`, `Date`, `Math.random`,
`fetch` or timers inside Effect; hashed service keys). When one of them
reports an error, the rule is intended: fix the code, do not work around the check.

## Architecture rules

The pages to copy are `src/app/pages/home` (a page made of parts) and `src/app/pages/about` (a page in one
module).

The runtime of the Elm architecture is [`@fgaudo/effect-tea`](https://www.npmjs.com/package/@fgaudo/effect-tea),
an npm dependency developed in its own repository (`github.com/fgaudo/effect-tea`). Read its README
(`node_modules/@fgaudo/effect-tea/README.md`) before changing a program: the rules in its "Guide" (intents
instead of toggles, one-shot actions moving to a state that rejects them, input never a reason to reject, an
operation as a state that only its completion leaves, a model that shows less than `update` accepts, never
more) are rules of this app too, and are not repeated here. The app imports
`import * as Tea from '@fgaudo/effect-tea'`, and its tests `@fgaudo/effect-tea/testing`. Never patch it from
here: a change to the library is made, released and then upgraded to in this app.

- **Expected errors are typed, bugs crash.** Expected failures go through Effect's error channel
  (`Effect.tryPromise`/`Effect.try`, no `try/catch`, no bare Promises). A violated invariant is a defect
  (`Effect.die`): never silenced, retried or turned into a message. Commands turn expected failures into
  messages with `Tea.attempt`, subscriptions with a message of their own. A defect ends the run: crash reporting goes
  around `run` (`Effect.tapCause`), never recovers from it.
- **A service says in its type how its data ends.** One value is an `Effect<A, E>`. Values over time are a
  `Source<A, Done, E>` (`libs/source`, an Effect `Channel`): `Done` is what it ends with, e.g. the file of a
  download, and `never` for a source that never ends (database changes, scrolling, the back button). A
  `Tea.Subscription` is the same kind of channel, so a page subscribes by mapping a service's
  `Source<A, never>` into messages (`Channel.unwrap` to read the service, `Channel.map`); a finished process
  turns its `Done` into a message. An adapter built on a library's stream wraps it with `Source.fromStream`,
  which keeps listening once the stream has ended. Only on-going observation is a `Source`: a one-off read is
  an `Effect`.
- **Effects only in commands and subscriptions.** `update`, `makeModel` and views are pure; one global state,
  no local view state or mutable singletons.
- **The model holds the messages, `update` decides.** `update` returns `Tea.reject` when a message does not
  apply. The model's shape says which actions exist: a union with a case per state the view distinguishes,
  each holding only the messages of its controls (`open: Message`, `changeName: (name: string) => Message`),
  picked from the state as `update` reads it, never by calling `update`. Views send only what the model
  holds: they never build a message. The run ignores a message `update` rejects (a tap on a frame the state
  has moved past); a control shown where `update` rejects its message is a bug that the tests find
  (`dispatchViolations`).
- **State machines, no derived data.** One explicit state machine per concern (data, selection, form)
  instead of shared flags. Values that depend on time are computed in `makeModel` from a `now` that a clock
  subscription keeps in the state.
- **A program is split by concern, never by kind.** A program lives in one module until it is too large
  (300–400 lines); then it splits into **parts** (`pages/<page>/parts/`), each a `Tea.Program` with its own
  state, messages, commands and model, declared as a child of the page as the root declares the pages. What
  spans the parts (the menu, the back button) stays in the page's `program.ts`; what concerns one part, even
  how the user learns of its failure (Products' toast), stays in the part.
  Parts that read each other's state are one part. A part has a view of its own: what only the parent's view
  shows (Home's scrolling, which its top app bar and add button follow) is the parent's state, not a part. A
  parent's view never reads the fields of a part's model: it hands the model to the part's view functions,
  which draw the part's pieces where the parent leaves room for them (Products' list, and its subtitle and
  selection bar in Home's top app bar). A part is a folder (`parts/<part>/`) holding its program
  (`<part>.ts`), its view (`<part>.view.tsx`), their tests and arbitraries, and its `services/`.
  Never split a program into `messages`/`state`/`update` files: they would import each other in cycles.
- **Children are declared, never wired.** A parent (`Tea.parent<{ state; command?; event?; external? }>()`)
  declares each child with `child` (`get`, `set`, `subscribed`); the library routes their messages
  (`{ _tag: <child>, message }`), commands, subscriptions and models. A parent decides whether a child is
  there only with `get`, never by rejecting its messages. A child is started with `children.<Child>.init`,
  in `init` as in `onEvent`, and its `commands` go out with the parent's: reading its program's `init.state`
  would leave them behind. A parent's view gives each child's view its own dispatch,
  `Tea.dispatchTo(dispatch, '<Child>')`, which wraps the child's messages as the parent receives them. It is
  the same function in every frame, and a child's model the same object while its state is, so a view whose
  model rarely changes is drawn with snabbdom's `thunk` (e.g. Home's product list).
- **Pages talk to their parent through events** (`Event`, handled by the parent's `onEvent`), never by
  acting on it. A program exports its `Message`, `Event` and `Command` as types only (a parent's with
  `Tea.MessageOf` and `Tea.CommandOf`), and its `ExternalMessage` (what its parent may give it with
  `children.<Child>.update`), when it has one, as a value; tests build their own constructors with
  `Data.taggedEnum<Message>()`. A parent never asks a child about its state to decide what to do: what a
  child needs, it gets through its own services and subscriptions. Hidden pages keep receiving their
  completions, but their subscriptions run only while they are on top.
- **The back button is each page's, only while it has something to do with it.** A page observes the
  platform's `BackButton` (`src/infrastructure/back-button`, a subscription keyed `back-button`) while it has
  something to close (Home, while its menu is open), or always, when a press asks its parent to leave it (About)
  or must be held (AddProducts, while a product is being added). The root knows nothing of the button. A
  press goes to the last observer only, as Android's own back dispatcher does: what opened last is on top and
  closes first, so two things that close on back never need a parent to order them. When no page observes it, the
  platform leaves the app: Android itself, or the browser's history, past the app. The engine only delivers a
  subscription's message to a state that lists its key, so a page that observes the button only in some
  states treats a press in the others as a defect.
- **A message that cannot arrive is a defect, not a rejection.** `Tea.reject` is for a message that does
  not apply in this state and may still arrive (a tap on a frame the state has moved past). A message the
  invariants rule out, such as an operation's completion outside the state that only it leaves (`Completed`
  outside `Submitting`), or a subscription's message outside the states that list it, ends the run with
  `defect(reason)` (`libs/defect`), a thrown error in expression form. The tests of `update` skip those pairs
  of state and message, and check them as defects.
- **A service belongs to what uses it, and is never shared.** A service (a `Context.Service`: a port, in the
  terms of ports and adapters) is a requirement of its consumer, listed in its program's `services`, shaped for
  it and free to change with it. It is a folder named after it in its consumer's `services/`, holding the
  service, its adapters (the layers that provide it, named after what backs them), its contract and their
  tests: a part's (`parts/products/services/product-list/`: `product-list.ts`, `product-list.sql.ts`, …), a
  page's (`pages/add-products/services/scanner/`). So a program's folder holds the
  program (`program.ts`, `view.tsx`, `layer.ts`, their tests), its `services/` and its children (`parts/`,
  `pages/`). Two consumers that need the same thing today each have their own service (the AddProducts
  page's `AddProducts` and Products' `DeleteProducts`): what they truly share is the domain and the
  infrastructure, never the service. The exception is a fact of the platform that no consumer could shape
  (`src/infrastructure/back-button`: a press is a `void`; `src/infrastructure/notifications`: a toast is a text,
  for every program alike): it is a service of the infrastructure, with its adapters, which the programs that
  need it list among their `services` directly, since a service of their own would only repeat it. The day a
  consumer needs it shaped (a toast with an action), that consumer gets a service of its own, written on the
  infrastructure's. Write services have no read: a program learns about writes from the storage's changes (a
  `Source`), not from the code that wrote. Persistence services take a domain `Snapshot` and return
  `UnvalidatedSnapshot`s;
  adapters never read domain fields. What every adapter of the storage shares (the
  schema, the migrations, how a product is written) is in `src/infrastructure/sql`.
- **The domain decides what an entity is.** A new one is made with its `make` (e.g. `Product.make`), and
  a form lets the user submit only what `make` accepts, asking the domain's own rules (`Product.make`,
  `Product.canExpireOn`) rather than repeating them; the command then carries the entity, valid by
  construction. `fromSnapshot` only reads stored data, and is more forgiving, so that what was stored can
  still be shown and deleted.
- **Shared things move up, never sideways.** What must be one truth moves up: the rules of an entity to
  `src/domain`, how things are done (the schema, how a product is written, a platform call that is more than
  a line) to `src/infrastructure`. Services never move up; pages never import each other.
- **One storage per setup**: every adapter of the storage is written once, on `SqlClient` (providing itself
  the helpers it builds on, such as `SqlHelper`), and the entrypoint provides the engine (sqlite in a worker on
  the phone, in memory in development and tests, empty on every start).
- **Migrations are append-only**: a phone has already run the existing ones, so a fix is a new migration.
- **Environments exist only in `src/entrypoints/`.** Shared code never branches on `process.env.NODE_ENV`.
  A `layer.ts` (the app's, a page's) provides every adapter that has no alternative, the infrastructure's
  services' included (the app's provides the toasts); what has alternatives (the `SqlClient`, the platform's
  `BackButton`) is left out of the layers, and each entrypoint picks one by importing the adapter's own module,
  wherever its service is (`#infrastructure/back-button/browser.layer.ts`,
  `#app/pages/home/parts/products/services/product-list/product-list.sql.ts`), never through a module that would load
  the other alternatives too: a missing choice fails the typecheck, and a bundle only contains what it uses. A
  service that gains a second adapter leaves its owner's `layer.ts` the same way. When moving files, update the
  paths in `scripts/cli.ts` and `package.json`.
- **`src/libs/` is generic**: no knowledge of the app. A branded type with a rule is defined once, as a
  `Schema` (`Schema.Int.pipe(Schema.brand(…))`, `.check(…)` for the rule), and its type, `make` (an
  `Option`) and `makeUnsafe` (only for values valid by construction) are derived from it; `Brand.make` only
  for a generic type, `Brand.nominal` for a brand without a rule. `make` checks a value of the base type as it
  is; a constructor that converts it first is named after its input (`NormalizedString.fromString`
  normalizes). Export only what is used, plus a library module's intended API.

## Views

TSX (`view.tsx`, `<part>.view.tsx`, and only views), rendered by snabbdom. Attach the model's messages with
`handlers(dispatch)` from `libs/tea-snabbdom`, matching the model's case:
`on={menu._tag === 'Closed' ? on('click', menu.open) : {}}`. `onPreventingDefault` is the exception that
always attaches (e.g. the native menu of a long press), with an optional message. An input the user types into
gets its text with `initialValue` (written only when the input is created), never from `props.value`: a frame
older than the last keys would take them back. A large view splits along the parts; components that know
nothing of the app (e.g. `libs/ui/overlay.tsx`) go to `libs/ui/`. The development server swaps the view in
place when only `.tsx` and `.css` files change, wherever they are, and reloads the page otherwise.

Views follow Material 3 through the theme, which leaves out Tailwind's own colors, font sizes, radii and
shadows. A control is the Material component that does its job, built to that component's spec (its colors,
size, shape and elevation): a list of things is a list, not cards; an action of the page is a FAB or a top app
bar's icon button; a form that opens over the page is a modal bottom sheet, within the thumb's reach, with
outlined text fields; selected things turn the top app bar into a contextual one with their actions.

- colors are Material's roles (`src/palette.generated.css`), generated from the key colors in `scripts/palette.ts` (change
  those and run `bun run update-palette`, never the generated file): what is drawn on a role takes its `on-`
  role (`bg-primary-container text-on-primary-container`), a dimmed text `on-surface-variant`; an opacity only
  where Material sets one (a disabled control, 38%; the scrim, 32%);
- text sizes are the type scale (`text-title-medium`, `text-body-small`), radii the shape scale
  (`rounded-medium`, `rounded-full`), shadows the elevation levels (`shadow-elevation-3`, a FAB's), all in
  `src/styles.css`; a surface's level is its component's, and a raised surface takes its tone from its
  container role (`surface-container-low` for a drawer), not from a shadow alone;
- what can be pressed carries `state-layer`, Material's feedback on hover, focus and press.

## Tests

- `bun:test` and fast-check property tests, in a `*.test.ts` next to the module. A property the code does
  not satisfy yet stays as `test.failing` with the bug in its name.
- A test's name says what it checks. When a change touches a test, or what it tests, check that its name, its
  `describe` and its comments still say what the assertions check: a test adapted to a new design keeps an old
  name that promises what it no longer proves.
- Code used only by tests lives in `*.test_<kind>.ts` files (`test_arbitrary`, `test_contract`,
  `test_support`): Biome lets only `*.test.ts` and other `*.test_*.ts` files import them, and `bun test`
  does not run them.
- Every page's `program.test.ts` renders the real view for arbitrary states and checks, with
  `dispatchViolations` (`@fgaudo/effect-tea/testing`), that each message it sends (`messagesSentBy`, in
  `libs/tea-snabbdom`) is accepted, and acts once when sent twice unless it is listed as `repeatable`, and
  that, of the candidates the test lists, nothing the user could ask for and `update` accepts is missing from
  it, but what is `withheld` on purpose. Models in tests come from `program.makeModel`. A part's `update` has
  its own tests (`parts/<part>/<part>.test.ts`). The root's tests act like a user (`app/user.test_support.ts`),
  with `rehearse`: each message is taken from what the shown page's model holds, a subscription's message is
  heard when the test says so, and commands run on the app's layer, over a database in memory, when the test
  runs them, none left pending. A tap on a frame the state has moved past is tested with `update` itself. What
  a program listens to comes from `Tea.subscriptionsOf(program)`. Generic helpers (`outcomesOf`, `onlyChanged`,
  `assertProperty`, `checkOnFreshLayer` for contracts) are in `libs/testing/`. Assert commands by value,
  rejections with `Tea.isRejected`, never as "state unchanged".
- Branded and domain types have a `*.test_arbitrary.ts` file producing only valid values; build generators
  from them, not from `*Unsafe` constructors.
- A service's contract (`<service>.test_contract.ts`, next to the service) says what every adapter must do,
  and each adapter's own `<service>.<backing>.test.ts` runs it: a second adapter passes the same contract. What
  a contract needs beyond its service (reading back a write, storing products to list or delete) comes from
  the adapter's test, through the storage itself (`infrastructure/sql/products.test_support.ts`): reads and
  writes that only tests need never go into a service, nor into another part's.

## Conventions

- Imports: relative within a part of the project (downwards in `src/app`, within a module of `libs/`), at most
  `../../`; another part through its alias, from the `imports` of `package.json` (`#app/…`, `#domain/…`,
  `#libs/…`, `#infrastructure/…`), never through `tsconfig` paths. Dependencies point inwards: the domain
  imports only `libs/`; the infrastructure the domain and `libs/`; the app all three; the entrypoints
  everything.
- Effect modules as namespaces (`import * as Effect from 'effect/Effect'`), with `Arr`, `Opt`, `Req`, `T`
  for `Array`, `Option`, `Request`, `Tuple`. Unions with `Data.TaggedEnum`, matched with `Match`.
- A function that returns an effect made with `Effect.gen` is an `Effect.fn('Name')` instead, with what would
  follow it in a `pipe` as its further arguments; `Effect.fnUntraced` where it runs often (on every frame, in a
  loop). An effect that takes no arguments (a layer, a migration) stays an `Effect.gen`.
- Nothing deprecated: no module, type, function, method or option marked `@deprecated`, of any dependency, in
  code, tests or scripts. Use what the deprecation names instead, and replace a use found in passing.
  `bun run lint` warns about one (Oxlint's type-aware `typescript/no-deprecated`).
- A file a tool writes is never edited by hand: change what it is made from and run the tool again. Such a file
  is named `<name>.generated.<ext>` (`src/palette.generated.css`, by `bun run update-palette`;
  `licenses.generated.json`, by `bun run update-licenses`), and a new one is too; dprint and Biome skip them.
  The files whose name their tool fixes are the exception: `android/app/capacitor.build.gradle` and
  `android/capacitor.settings.gradle` (written by `bunx cap sync`), the launcher icons and the splash screens
  in `android/app/src/main/res` (by `@capacitor/assets`, see `README.md`).
- Format only the files you changed (`bunx dprint fmt <files>`): a bare `dprint fmt` rewrites Android
  resources and untouched code.
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

- Home's view only shows `Valid` products: `Invalid` and `Corrupt` ones are in the model and counted in
  `total`, but not rendered, so the count can exceed the rows shown and an invalid product cannot be
  selected or deleted from the UI.

- A scanned barcode is the product's name as it is: no lookup of the product (e.g. Open Food Facts) yet. The
  scanner (`getUserMedia` and the Shape Detection API, `scanner.browser.ts`) has not been tried on Android yet;
  on a desktop without the API (Chrome on Windows), the form says the camera is not available.

When an item is resolved, update this section.
