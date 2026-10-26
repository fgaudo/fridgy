# Fridgy — guide for coding agents

What the app is and its commands are in [`README.md`](README.md); the source tree, a reading order and the
import boundaries are in [`src/README.md`](src/README.md). This file holds the rules that apply to every change.
The app is in the middle of a refactoring: see "Known gaps" before working.

Procedures live in skills, plain Markdown that any agent or person reads, under `.agents/skills/`. Read the one
for the task before starting it:

| Before…                                                         | read                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| adding a page or a child, or changing how a parent declares one | [`add-program`](.agents/skills/add-program/SKILL.md)         |
| adding a service, an adapter or a migration                     | [`add-service`](.agents/skills/add-service/SKILL.md)         |
| editing a `view.tsx`, `src/styles.css` or the palette           | [`views`](.agents/skills/views/SKILL.md)                     |
| building for Android, upgrading Capacitor, releasing            | [`android-release`](.agents/skills/android-release/SKILL.md) |

Before changing a program, read the "Guide" of the runtime, `node_modules/@fgaudo/effect-tea/README.md`: its
rules (intents instead of toggles, one-shot actions moving to a state that rejects them, input never a reason
to reject, an operation as a state that only its completion leaves, a model that shows less than `update`
accepts, never more) are rules of this app, and are not repeated here. Never patch the library from here: a
change to it is made in `github.com/fgaudo/effect-tea`, released and then upgraded to.

## Language

All code, comments, identifiers, commit messages and `.md` files are in **English**. Chat with the user may be
in Italian.

## Commits

A commit made with an AI agent ends with an `Assisted-by: <model>` trailer (e.g. `Assisted-by: Claude Opus 5.5`),
never `Co-Authored-By`: the author is the person who commits. A clear subject is usually enough: a body only says
why, or what the diff and the docs do not, never what they already describe.

## Tooling enforces a lot

Biome enforces the import boundaries ("Visibility" in `src/README.md`), and keeps test-only code
(`*.test_*.ts`, `@fgaudo/effect-tea/testing`) out of bundles and relative imports short. The typecheck
enforces the strict typing of views (`dispatch` only takes the program's own messages; JSX elements only
accept snabbdom's modules) and the Effect language service's rules (no `console`, `Date`, `Math.random`, `fetch`
or timers inside Effect; hashed service keys). Oxlint warns about deprecated APIs. When one of them reports an
error, the rule is intended: fix the code, do not work around the check.

## Architecture rules

Every program has the same shape, whatever its depth: a folder holding `program.ts`, `view.tsx`, `layer.ts`,
their tests, `services/` and `children/`. The root (`src/app`), a page (a child of the root, one of the stack
it shows) and a child of a page are all such folders; "page" names a role in the UI, kept by the root's state,
not a kind of program. The programs to copy are `src/app/children/home` and `src/app/children/about`.

- **Expected errors are typed, bugs crash.** Expected failures go through Effect's error channel
  (`Effect.tryPromise`, `Effect.try`; no `try/catch`, no bare Promises): commands turn them into messages with
  `Effect.match` and `Effect.asSome`, subscriptions with a message of their own. A violated invariant is a
  defect (`Effect.die`, `defect(reason)` from `libs/defect`), never silenced, retried or turned into a message;
  crash reporting goes around `run` (`Effect.tapCause`) and never recovers from it.
- **`Tea.reject` is for a message that does not apply but may arrive** (a tap on a frame the state has moved
  past). A message the invariants rule out (an operation's completion outside the state that only it leaves, a
  subscription's message outside the states that list its key) is a defect: the tests skip those pairs of
  state and message in `update`'s properties, and check them as defects.
- **The model holds the messages, `update` decides.** The model is a union with a case per state the view
  distinguishes, each holding only the messages of its controls, picked from the state as `update` reads it.
  Views send only what the model holds, never a message they build.
- **State machines, no derived data.** One explicit state machine per concern (data, selection, form) instead
  of shared flags. Values that depend on time are computed in `makeModel` from a `now` that a clock
  subscription keeps in the state. Effects only in commands and subscriptions: `update`, `makeModel` and views
  are pure; one global state, no local view state, no mutable singletons.
- **A service says in its type how its data ends.** One value is an `Effect<A, E>`; values over time are a
  `Source<A, Done, E>` (`libs/source`), `Done` being `never` for one that never ends. Only on-going observation
  is a `Source`; a one-off read is an `Effect`.
- **A program is split by concern, never by kind.** It lives in one module until it is too large (300–400
  lines), then splits into children, each a program of its own. What spans the children stays in the parent;
  what concerns one child, even how the user learns of its failure, stays in the child; children that read
  each other's state are one child. Never `messages`/`state`/`update` files: they would import each other in
  cycles.
- **Children are declared, never wired; a child talks up through events.** A parent declares a child and the
  library routes its messages, commands, subscriptions and models; a parent never reads a child's state to
  decide, nor rejects its messages to hide it. What a child needs, it gets from its own services; only a fact
  several children must see as one truth is the parent's, handed down as an `ExternalMessage`. Hidden pages
  keep receiving their completions, but their subscriptions run only while they are on top.
- **The back button is each page's, only while it has something to do with it.** A page observes the
  platform's `BackButton` (`src/infrastructure/back-button`, the subscription keyed `back-button`) while it has
  something to close, or always, when a press asks its parent to leave it or must be held. The root knows
  nothing of it. A press goes to the last observer only, as Android's own back dispatcher does; when no page
  observes it, the platform leaves the app.
- **A service belongs to what uses it, and is never shared.** A service (a `Context.Service`: a port) is a
  requirement of its consumer, in its `services/`, shaped for it. Two consumers that need the same thing each
  have their own; what they share is the domain and the infrastructure. The exception is a fact of the platform
  that no consumer could shape (`src/infrastructure/back-button`, `src/infrastructure/notifications`), a
  service of the infrastructure that programs list directly. Write services have no read: a program learns
  about writes from the storage's changes. Persistence services take a domain `Snapshot` and return
  `UnvalidatedSnapshot`s; adapters never read domain fields.
- **The domain decides what an entity is.** A new one is made with its `make` (`Product.make`), and a form
  lets the user submit only what `make` accepts, asking the domain's rules (`Product.canExpireOn`) rather than
  repeating them; the command carries the entity, valid by construction. `fromSnapshot` only reads stored data,
  and is more forgiving, so that what was stored can still be shown and deleted.
- **Shared things move up, never sideways.** The rules of an entity to `src/domain`; how things are done (the
  schema, how a product is written, a platform call longer than a line) to `src/infrastructure`. Services never
  move up; a program never imports a sibling; an adapter stays a thin wrapper on the infrastructure. No program
  is used by two parents yet: the day one is, it gets a folder of its own under `src/app`, outside every
  `children/`, with an alias and a Biome rule of its own.
- **One storage per setup; migrations are append-only.** Every adapter of the storage is written once, on
  `SqlClient`; the entrypoint provides the engine. A phone has already run the existing migrations, so a fix is
  a new one.
- **Environments exist only in `src/entrypoints/`.** Shared code never branches on `process.env.NODE_ENV`.
  Every `layer.ts` provides the adapters of its own services that have no alternative, merged with its
  children's; what has alternatives (the `SqlClient`, the `BackButton`) is left out, and each entrypoint
  imports the adapter it picks by its own module. A missing choice fails the typecheck.
- **`src/libs/` is generic**: no knowledge of the app. A branded type with a rule is a `Schema`
  (`Schema.Int.pipe(Schema.brand(…))`, `.check(…)`), with its type, `make` (an `Option`) and `makeUnsafe`
  (only for values valid by construction) derived from it; `Brand.make` only for a generic type,
  `Brand.nominal` for a brand without a rule. A constructor that converts its input first is named after it
  (`NormalizedString.fromString`). Export only what is used, plus a library module's intended API.
- **Only what can be tested is supported.** `minSdkVersion`, `minWebViewVersion` and the target SDK move only
  as the `android-release` skill says, checked in the emulator first, with the docs.

## Tests

- `bun:test` and fast-check property tests, in a `*.test.ts` next to the module. A property the code does not
  satisfy yet stays as `test.failing` with the bug in its name.
- A test's name says what it checks. When a change touches a test, or what it tests, check that its name, its
  `describe` and its comments still say what the assertions check.
- Code used only by tests lives in `*.test_<kind>.ts` files (`test_arbitrary`, `test_contract`,
  `test_support`): Biome lets only `*.test.ts` and other `*.test_*.ts` files import them, and `bun test` does
  not run them. Branded and domain types have a `*.test_arbitrary.ts` producing only valid values; generators
  are built from them, never from `*Unsafe` constructors.
- Every program's `program.test.ts` checks that the real view sends only what `update` accepts, all of it, once
  (`dispatchViolations`); the root's tests act like a user (`src/app/user.test_support.ts`, `rehearse`), over
  a database in memory. Assert commands and events by value, rejections with `Tea.isRejected`, never as
  "state unchanged". Generic helpers are in `libs/testing/`.
- A service's contract (`<service>.test_contract.ts`) says what every adapter must do, and each adapter's test
  runs it. What a contract needs beyond its service comes from the adapter's test, through the storage itself:
  reads and writes that only tests need never go into a service.

## Conventions

- Imports: relative within a part of the project (downwards in `src/app`, within a module of `libs/`), at most
  `../../`; another part through its alias, from the `imports` of `package.json` (`#app/…`, `#domain/…`,
  `#libs/…`, `#infrastructure/…`), never through `tsconfig` paths.
- Effect modules as namespaces (`import * as Effect from 'effect/Effect'`), with `Arr`, `Opt`, `Req`, `T` for
  `Array`, `Option`, `Request`, `Tuple`. Unions with `Data.TaggedEnum`, matched with `Match`.
- A function that returns an effect made with `Effect.gen` is an `Effect.fn('Name')` instead, with what would
  follow it in a `pipe` as its further arguments; `Effect.fnUntraced` where it runs often. An effect that takes
  no arguments (a layer, a migration) stays an `Effect.gen`.
- Nothing deprecated, of any dependency, in code, tests or scripts: use what the deprecation names instead, and
  replace a use found in passing.
- A file a tool writes is never edited by hand: change what it is made from and run the tool again. Such a file
  is named `<name>.generated.<ext>` (`src/palette.generated.css`, by `bun run update-palette`;
  `licenses.generated.json`, by `bun run update-licenses`), and a new one is too; dprint and Biome skip them.
  The files whose name their tool fixes are the exception: `android/app/capacitor.build.gradle` and
  `android/capacitor.settings.gradle` (by `bunx cap sync`), the launcher icons and the splash screens (by
  `bun run update-assets`).
- Format only the files you changed (`bunx dprint fmt <files>`): a bare `dprint fmt` rewrites Android
  resources and untouched code.
- Comments only for what the code cannot say: a reason, an invariant the types do not show, a platform
  behaviour relied upon, a choice that would look like a mistake. Never a repetition of names, of the next
  line or of this file.
- No blank lines between the statements of a block; blank lines separate declarations, object entries of
  large tables (`update`'s handlers) and `describe`/`test` calls.
- Logging only where effects run: `error` for a bug right before the app dies, `warn` for a handled failure
  with its cause, `info` for rare events, `debug` for the program's loop. Commands carry `Effect.withLogSpan`.
- Documentation is part of the change: update `README.md`, `src/README.md`, this file and the skills when what
  they describe changes, and remove what is no longer true.

## Known gaps (verify before working)

- Home's view only shows `Valid` products: `Invalid` and `Corrupt` ones are in the model and counted in
  `total`, but not rendered, so the count can exceed the rows shown and an invalid product cannot be selected
  or deleted from the UI.
- A scanned barcode is the product's name as it is: no lookup of the product (e.g. Open Food Facts) yet. The
  scanner (`getUserMedia` and the Shape Detection API, `scanner.browser.ts`) has not been tried on Android yet;
  on a desktop without the API (Chrome on Windows), the form says the camera is not available.
- Capacitor 9 alpha (API 37, WebView 114) has not been built or run in the emulator yet.

When an item is resolved, remove it.
