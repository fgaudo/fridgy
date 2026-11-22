# Roadmap

What is to be done or decided now, and nothing else. A step done is removed, with the reason in the commit: what a
later step needs to know of it is written on that step. The steps come from a review of the architecture that the
owner asked for on 22 November 2026, and from what the runtime's own roadmap decides for an application
(`ROADMAP.md` and `docs/records/application-report.md` of `github.com/fgaudo/effect-tea`, read at its commit
`cdd1565`).

Each step names its model and effort, what it depends on, and how to tell that it is done. Every step also ends
with `bun run typecheck`, `bun run test`, `bun run lint` and `bunx dprint check` passing, and with the documents
that describe what it changed brought up to date (`AGENTS.md`, "Conventions").

## Next, in order

### 1. The root: Home, and at most one page over it, by its visit

**Model and effort.** Opus 5.5, `high`: code that keeps the invariants of the navigation.

**Depends on** no other step.

**Why.** Two findings, in the same code.

- **A page is found by its name, so it hears the answers of its past visit.** A command cannot be cancelled, and its
  answer goes to the page of that name that is there when it arrives (`page(tag)`, `src/app/program.ts`). `About`
  accepts a load on a page already loaded, and `AddProducts` rejects a late `CameraChecked`, each by hand.
  `EditProduct` does not: `OrderKept` while `Loading` is a defect (`src/app/children/edit-product/program.ts`), and
  it arrives. Pick another date order, leave the page, open a product before the write completes: the app crashes.
  Reproduced on 22 November 2026 with `rehearsed`: `ProgramDefect: A defect in update on EditProduct › OrderKept`.
- **The stack is more general than the app.** Only Home shows a page, and only while it is on top: the stack is
  never deeper than two, and a page is in it at most once. Only prose says so (`show`, `leave`). `leave` has a
  defect for a case that cannot be, and a test builds a stack of three that no user reaches. The search that
  `docs/search-products.md` designs stays inside Home.

**How.**

- The state is Home, the number of visits so far, and at most one page over Home, with the number of its visit. No
  stack.
- The pages over Home are children by id (`childById`), the id being the visit's number, never used again: the
  guide's own remedy ("Composition", "Ids that come back"). The library then rejects an answer, and a tap of a
  frame drawn before, for a visit that is gone.
- An answer of a past visit can then no longer arrive. Read again each handler that puts up with one (`About`'s
  loads, `AddProducts`' `CameraChecked`), and make the code, its comments and its tests say what is true now.
  `EditProduct`'s defect stays a defect.
- A page's place is a `get` and a `set` written by hand: the `set` changes its place and nothing else (step 2).
- The subscription keys become `[<page>, <visit>, <key>]`: `src/app/user.test_support.ts` follows.
- The new tests go through `rehearsed` and the models, not through a page's state built or read by hand: the
  runtime weighs a child's state that its parent cannot read ("Waiting for effect-tea").

**Done when**

- the state's type holds what prose held: Home always there, one page over it at most, no defect left for a stack
  that cannot be;
- this scenario is a test of `src/app/program.test.ts`: add a product, open it, hear its clock and its date order,
  pick another order, go back, open it again, run every pending command; the app survives and the second visit is
  as it started;
- for each page over Home, a test opens it, leaves it with its commands pending, opens it again and runs them all:
  nothing dies, and the second visit is loaded by its own answers;
- `AGENTS.md` ("Hidden pages keep receiving their completions"), the `add-program` skill, `README.md` ("a stack of
  pages") and `src/README.md` describe the root as it is.

### 2. A `set` that changes its place and nothing else

**Model and effort.** Opus 5.5, `high`: Home's scrolling keeps invariants that only the emulator shows.

**Depends on** no other step. It comes before the upgrade to effect-tea 0.8.1, which says that a `set` that does
more is not supported.

**Why.** The runtime's owner decided it on 22 November 2026, from this application's own report
(`application-report.md`, point 2): a `set` that changes more than its place is an `update` under another name. It
decides on a write, no test of the model sees it, and an equal write skips it. Two inputs of the app do so:

- **Home's three heights** (`src/app/children/home/program.ts`). Their `set` runs `laidOut`, which also changes
  `collapse`, `rest` and `generation`.
- **AddProducts' `Name`** (`src/app/children/add-products/program.ts`). Its `set` also makes `lookup` `Idle`.

**How.**

- Home: a height is stored as it is written. What a new layout decides (the list drawn anew at its top, the bar
  expanded) is `update`'s: the handler writes the height, then sends a message that the model holds, and `update`
  reads the height from the state (the guide of 0.8.1, "Inputs", "A fact that comes with a value is a write, then a
  message"; Home's `Rest` and `ScrollEnded` already do it). What only follows from the heights, as the collapse
  kept within what the list can scroll, is computed in `makeModel`.
- AddProducts: the lookup keeps the name it left, and `makeModel` shows its line only while the name is still that
  one: what follows a write is computed where the state is read. A name typed back to the one found shows the
  attribution again, as it is that product's name.
- Home's `Scroll` and About's `Scroll` store another form of what is written, which 0.8.x allows: they stay, and
  wait for the runtime ("Waiting for effect-tea").

**Done when** no `set` under `src/app/` changes anything but its place: each place is an optic, or a property test
holds its `get` and `set` to the three laws of a lens, until the runtime's own check takes its place; the programs'
tests check the same behaviour as before; and Home is checked on the emulator, as the `android-release` skill says:
the bar collapses and snaps, and a change of the font size or of the screen draws the list anew at its top.

### 3. A link is opened by a command

**Model and effort.** Opus 5.5, `medium`.

**Depends on** no other step.

**Why.** Three views call `Linking.openURL` in an `onPress`: `src/app/children/about/view.tsx` (the `link` helper,
for six fixed links, and a card's repository) and `src/app/children/add-products/view.tsx` (Open Food Facts'
attribution). It is an effect in a view, and a bare Promise, which rejects when nothing opens the URL. It runs
outside `update`, and outside what `messagesSentBy` checks.

**How.**

- A service of the infrastructure, `src/infrastructure/links/`, as `haptics/` is: a fact of the platform that no
  page could shape. `src/app/layer.ts` provides it; `src/app/user.test_support.ts` gives one that opens nothing.
- In each program, a message that the model holds for each link, and a command that opens it. A failure is logged
  as a warning and not told, as a vibration's is.

**Done when** no module outside `src/infrastructure/` names `Linking`; each view's test sees the links' messages,
and `update` accepts them; `AGENTS.md` lists `links` with the infrastructure's other services ("A service belongs
to what uses it").

### 4. A stored row is read on its own

**Model and effort.** Opus 5.5, `high`.

**Depends on** no other step.

**Why.**

- **`Corrupt` and `Invalid` cannot arise** (`src/app/children/home/children/products/program.ts`). The id is the
  rowid, `name` and `creation_date` are `NOT NULL` (`migrations.ts`), and `fromSnapshot` replaces a blank name. No
  contract writes such a row. The program, its view, its arbitraries and its tests carry both cases.
- **The failure that can happen takes the whole list.** `readAll` decodes the rows as one array
  (`SqlSchema.findAll`, in `product-list.sql.ts`): one row with a malformed date fails the read, and the list is
  `Failed`.

**How.**

- Decode each row on its own. A row whose fields cannot be read is still listed, by its id, and by its name when
  that reads: it is `Invalid`, selected and deleted as today.
- `Corrupt` goes: a row always has its id, and `StoredProduct` says so.
- An expiration that cannot be read makes the row `Invalid`, never a product that never expires.
  `UnvalidatedSnapshot` cannot tell the two apart today: its `maybeExpirationDate` is `None` for both.

**Done when** `ProductList`'s contract stores, through `products.test_support.ts`, a row with a malformed creation
date and one with a malformed expiration, and finds both listed as no products beside the good ones; `Corrupt` is
gone from the program, the view, the arbitraries and the tests.

### 5. An id that is the storage's, and writes that say how they fail

**Model and effort.** Opus 5.5, `high`.

**Depends on** step 4, which makes the id always there.

**Why.**

- **An id is a `string` everywhere, parsed back twice.** `delete-products.sql.ts` and `update-product.sql.ts`
  turn it into an integer with the same lines and the same comment, each with a branch for an id that was never
  written.
- **The writes have three shapes.** `AddProducts.add` is a `RequestResolver` asked one request per command, whose
  failure is `void`. `DeleteProducts` uses resolvers to put a selection in one transaction, and must complete every
  request only once the transaction is over (its comment says why). `UpdateProduct.update`, written last, is a
  function with tagged errors.

**How.**

- An opaque `ProductId` in `src/domain/product.ts`, which only `src/infrastructure/storage/products.ts` makes and
  reads. The ports, the programs' states, messages and events carry it; a view makes its key from it.
- `AddProducts.add`, `DeleteProducts.deleteAll` and `restoreAll` as functions that return an `Effect` with tagged
  errors, each one transaction, as `UpdateProduct.update` is.

**Done when** no adapter parses an id, and no branch is left for one that was never written; no `Request` is left
under `src/app/`; the contracts check all or nothing as before, and each failure by its tag.

### 6. What has one truth is written once

**Model and effort.** Opus 5.5, `medium`.

**Depends on** no other step.

**Why.** Counted on 22 November 2026:

- The subscription to `BackButton` is the same lines in five programs, the one to `Keyboard` in two, and the effect
  of the `Vibrate` command in three.
- The programs' timers repeat, as numbers, the durations that the views take from `#styles`:
  `add-products/program.ts` (`300 + 500`, `200 + 250`) and `products/program.ts` (`500`). Only a comment ties them.
- Material's rule that a snackbar after another waits for it (`Entrance`, `told`) is written in three programs.
- What a date's digits name under the field (`Hint`, the days, `NamingNothing`) is decided by the same lines in the
  `makeModel` of `AddProducts` and of `EditProduct`.

**How.**

- Beside each service of the infrastructure (`back-button.ts`, `keyboard.ts`, `haptics.ts`), what every program
  writes to use it: the subscription, taking the message to send, or the command's effect. Typed with `Source`, and
  kept small: the runtime weighs a subscription made from its key alone ("Waiting for effect-tea").
- Material's durations in a module of `src/libs/` with no React Native in it. `src/styles.ts` takes them from
  there, and the programs' timers are written with them.
- The snackbar's queueing in `src/libs/`, as far as the three are the same. `Products`' snackbar keeps the time of
  what it tells (`at`), which the other two do not need: that part stays its own.
- The rule of what the digits name in `src/libs/dates/digit-date-entry.ts`, as data that holds no message.

Not to do: the date entry as a program of `programs/`. Each page reads the day the digits name, to enable its
button and to submit, and a parent never reads a child's state (the guide, "Structuring a program", "Splitting a
program"), which the runtime weighs holding by its types. It is the page's own state. The two `date-order-setting`
services stay two as well: see "Waiting for the owner".

**Done when** each of the four has one definition, and the programs' tests check what they checked.

### 7. Design: the app in the user's language

**Model and effort.** Fable 5.2, `high`: a design, whose steps are then written here, each with its own model.

**Depends on** steps 3 and 6, which change the views it reads. The owner is asked first: which languages.

**Why.** The texts are English, literals in the views (about 65), in the crash screen, and one in the domain
(`'Undefined name'`, `fromSnapshot`). The dates, the order of a date's digits and the language Open Food Facts is
asked in follow the device. The models hold tags and values, never text, so the views are the only place the texts
are.

**How.** The design decides:

- where the language comes from. A view is pure and cannot read it: it is a fact of the platform, read by a
  service and kept in the state. Android recreates the activity when the language changes, and the JavaScript keeps
  running;
- where the texts live, and how a view gets them;
- counts and plurals;
- `Day.format`, which reads the runtime's locale inside a view today;
- the domain's `'Undefined name'`;
- how a test tells that a language lacks a text.

**Done when** `docs/localization.md` holds the decisions and the facts they rely on, checked; the steps that
implement it are written here; the owner has read it.

## Any time

None of these waits for the steps above, nor holds them up.

- **What the web build left behind.** Sonnet 5.5, `medium`. `src/infrastructure/storage/samples.ts` has no
  importer, and `src/README.md` and the `add-service` skill ("The development database") still describe it: both
  go. `sqlite.memory.ts` is imported only by tests and their support, under a name that bundles may import, and
  `@effect/sql-sqlite-wasm` is a dependency of the app: it becomes `sqlite.memory.test_support.ts`, and its package
  a `devDependency` (`bun install` writes the lockfile). Four comments still name the browser: the header of
  `src/app/program.ts`, `src/infrastructure/back-button/back-button.ts`, `src/app/user.test_support.ts` ("the
  browser's scanner") and `src/libs/dates/date-order.ts`; `tsconfig.json` names `platform-browser`. Done when
  `browser` is found under `src/` only where it is true, `bun run bundle` passes, and `bun run update-licenses`
  leaves its file as it is.
- **The Android project built on every push.** Opus 5.5, `medium`. CI makes Metro's bundle and Hermes' bytecode,
  and never runs Gradle: the Kotlin of the app's native module
  (`android/app/src/main/java/net/gaudo/fridgy/barcodecamera/`), the codegen, the autolinking and `build.gradle`
  are compiled for the first time by hand, before a release. A job of its own in `.github/workflows/checks.yml`,
  beside the checks, which stay fast: `./gradlew assembleDebug -PreactNativeArchitectures=x86_64`, with Gradle's
  cache and its own timeout. Done when the job is green on a push, which is the owner's to make or to allow, and
  the layers of `docs/testing.md` and the `android-release` skill say what CI builds.

## Waiting for effect-tea

What the runtime's roadmap has open, and what each item decides here. An item becomes a step when its release is
out, or goes when the runtime rejects it.

- **0.8.1, not released.** It needs step 2 done. With it, `hear` takes any message of the program: `back`, in
  `src/app/user.test_support.ts`, no longer writes its messages whole. Its guide is to be read again for "Inputs",
  which says what an element reports, as a scroll its offset.
- **Its step 26, the entry for React outside a browser.** To weigh once it is decided: whether
  `src/libs/tea-react/renderer.ts` gives way to `@fgaudo/effect-tea/react`; whether
  `@babel/plugin-transform-class-static-block` leaves `babel.config.cjs`, should the package ship without `static`
  blocks; and what it says of a renderer that draws after the next event, which React Native is. `EditProduct`
  keeps the name's place while it saves, its field disabled, and `AddProducts` while it adds: the runtime's own form
  now locks by the shape of its state instead, and that step says what holds here. Its owner looks for such a
  renderer to run it under.
- **Its step 29, the form of a value out of `set`.** Home's `Scroll` stores the collapse, in twentieths, from the
  top written and the headline's height; About's stores whether the top is 0. The promise that lets them is to be
  taken back, for a form that is a function of the value alone: Home's reads the state, which that step's spike
  decides. Its check of a place's laws would take the place of the app's own (step 2).
- **Its step 30, a subscription made from its key alone.** Two of the app's use what their key lacks, harmlessly:
  `Products`' snackbar timer, keyed by `at` and the notice's tag, reads the notice's products for its duration; an
  arrival's timer in `AddProducts`, keyed by its id, reads its `entrance`. The helpers of step 6 would change form
  with it.
- **Its step 31, a child's state that its parent cannot read.** No program of the app reads one: the root reads the
  pages' tags, and Home never reads `products`. The tests do: `src/app/program.test.ts` builds pages' states by
  hand and reads Home's list (`homeState`), and `src/app/children/home/program.test.ts` reads `before.products`.
  What that step finds for a parent's test decides how they are written.

## Waiting for the owner

- **Home's scroll in the global state.** Every scroll event goes through `update`, the root's `makeModel` and
  React; the twenty steps of `collapse` soften it. The runtime says that such a value is an input, and what a write
  at each event costs. It needs a measurement on a phone, with a release build: the emulator keeps no frame rate
  (`docs/motion.md`). Should frames drop, what follows the scroll alone and the program does not decide by is the
  platform's to keep, moved on the UI thread.
- **AddProducts' clock ticks every second**, to keep the creation date close to the tap: the root's model is made
  every second while the page is shown. The command could stamp the product instead, against "the command carries
  the entity, valid by construction".
- **The date order as a service of the infrastructure.** `date-order-setting` is in `add-products/services/` and in
  `edit-product/services/`, the same but for a word of a comment and the service's key, contract included. "A
  service is never shared" means two. A setting of the user has no shape for a page to give it, as a fact of the
  platform has none: one service would extend that exception, which is a change of the rule.
- **The contracts on op-sqlite.** The phone's engine is a client written here (`sqlite.op-sqlite.ts`), whose update
  hook every list relies on; every test runs on wa-sqlite, and `docs/testing.md` says so. Running the contracts on
  the emulator needs their checks apart from `bun:test`. To weigh: whether that is worth its cost.
- **The crash screen shows nothing of the cause**, by decision (`src/entrypoints/crash/view.tsx`). The cause goes
  to the log, which a user cannot reach: a crash on a phone cannot be told apart from another. A detail the user
  can copy would still send nothing.
- **One adapter, two test files.** Every service of the storage has one adapter, and "one storage per setup" says
  there is no second. Its contract and the test that runs it could be one file: a change of the `add-service`
  skill's convention.
- **`programs/` is described in four documents and allowed by Biome, and nothing uses it.** Step 6 says why the
  date entry is not its first. Keep it as the place of a program to come, or cut it to a line.
