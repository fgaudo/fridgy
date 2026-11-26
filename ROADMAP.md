# Roadmap

What is to be done or decided now, and nothing else. A step done is removed, with the reason in the commit: what a
later step needs to know of it is written on that step. The steps come from a review of the architecture that the
owner asked for on 22 November 2026, and from the move to effect-tea 0.9.0 on 26 November 2026, which closed the
steps on the root and on the inputs, and what waited for that release.

Each step names its model and effort, what it depends on, and how to tell that it is done. Every step also ends
with `bun run typecheck`, `bun run test`, `bun run lint` and `bunx dprint check` passing, and with the documents
that describe what it changed brought up to date (`AGENTS.md`, "Conventions").

## Next, in order

### 1. The app on effect-tea 0.9.0, seen on the emulator

**Model and effort.** Opus 5.5, `medium`.

**Depends on** no other step. It comes first: the steps after it change the same views.

**Why.** The move to 0.9.0 changed every program and every view, and was checked by the tests, the typecheck,
Metro's bundle and Hermes' bytecode alone. No test sees what a view draws, nor what the platform does with it
(`docs/testing.md`).

**How.** As the `android-release` skill says, on a debug build and then a release. What changed, and what to look
at:

- **Home's scroll.** The heights, the offset and the end of a scroll are messages that the view fills, where they
  were inputs: the bar collapses and snaps, the add button shrinks while the list scrolls, a change of the font
  size or of the screen draws the list anew at its top, and Home comes back from a page where it rested.
- **The name's field**, in both pages: typing, clearing, a scan that replaces it, a key typed just before "Add"
  and "Save".
- **The date**, drawn by one view for both pages (`src/app/programs/expiration/view.tsx`): the segments, the
  field, the strip and the keypad lay out in each page's column as before. Its keys take nothing until the order
  is read, a moment after the date is first shown: nothing should be seen of it.
- **The fridge**, drawn by its own view (`src/app/children/add-products/children/fridge/view.tsx`), with no
  wrapper of its own in the name step's room: the flight of `docs/product-flight.md`.
- **The snackbars** of the three pages, and "Undo". One stands from when it was told: Home's, hidden under a page
  past its time, is gone when Home is back.
- **A page opened twice.** Each visit is drawn under a key of its own (`src/app/view.tsx`): the second shows
  nothing of the first, its fields' text included.
- **The root that draws.** The system theme changed while a page over Home is shown keeps that page
  (`src/entrypoints/native.tsx` starts the program itself, for this). The crash screen, and its restart.

**Done when** each item above was seen on the emulator, on a debug build and on a release, and what was found is
fixed, or written here as a step; `docs/motion.md` and `docs/testing.md` say what was seen, and when.

### 2. A link is opened by a command

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

### 3. A stored row is read on its own

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

### 4. An id that is the storage's, and writes that say how they fail

**Model and effort.** Opus 5.5, `high`.

**Depends on** step 3, which makes the id always there.

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
  reads. The ports, the programs' states, messages and events carry it, and the flags of `EditProduct`, which the
  root keeps and compares; a view makes its key from it.
- `AddProducts.add`, `DeleteProducts.deleteAll` and `restoreAll` as functions that return an `Effect` with tagged
  errors, each one transaction, as `UpdateProduct.update` is.

**Done when** no adapter parses an id, and no branch is left for one that was never written; no `Request` is left
under `src/app/`; the contracts check all or nothing as before, and each failure by its tag.

### 5. What has one truth is written once

**Model and effort.** Opus 5.5, `medium`.

**Depends on** no other step.

**Why.** Counted on 26 November 2026, after the snackbar and the date became programs of `src/app/programs/`:

- The subscription to `BackButton` is the same lines in five programs (`Home`, `Products`, `About`, `AddProducts`,
  `EditProduct`), the one to `Keyboard` in two, and the effect of the `Vibrate` command in three.
- The programs' timers repeat, as numbers, the durations that the views take from `#styles`: the fridge
  (`add-products/children/fridge/program.ts`: `300 + 500`, `500`, `200 + 250`) and `products/program.ts` (`500`).
  Only a comment ties them.

**How.**

- Beside each service of the infrastructure (`back-button.ts`, `keyboard.ts`, `haptics.ts`), what every program
  writes to use it: the subscription, taking the message to send, which a program's `listen` returns for its key,
  or the command's effect. Typed with `Source`, and kept small.
- Material's durations in a module of `src/libs/` with no React Native in it. `src/styles.ts` takes them from
  there, and the programs' timers are written with them. The snackbar's two (`programs/snackbar/program.ts`) are
  Material's too.

**Done when** each has one definition, and the programs' tests check what they checked.

### 6. Design: the app in the user's language

**Model and effort.** Fable 5.2, `high`: a design, whose steps are then written here, each with its own model.

**Depends on** steps 2 and 5, which change the views it reads. The owner is asked first: which languages.

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
  a `devDependency` (`bun install` writes the lockfile). Comments still name the browser:
  `src/infrastructure/back-button/back-button.ts`, `src/app/user.test_support.ts` ("the browser's scanner") and
  `src/libs/dates/date-order.ts`; `tsconfig.json` names `platform-browser`. Done when `browser` is found under
  `src/` only where it is true, `bun run bundle` passes, and `bun run update-licenses` leaves its file as it is.
- **The Android project built on every push.** Opus 5.5, `medium`. CI makes Metro's bundle and Hermes' bytecode,
  and never runs Gradle: the Kotlin of the app's native module
  (`android/app/src/main/java/net/gaudo/fridgy/barcodecamera/`), the codegen, the autolinking and `build.gradle`
  are compiled for the first time by hand, before a release. A job of its own in `.github/workflows/checks.yml`,
  beside the checks, which stay fast: `./gradlew assembleDebug -PreactNativeArchitectures=x86_64`, with Gradle's
  cache and its own timeout. Done when the job is green on a push, which is the owner's to make or to allow, and
  the layers of `docs/testing.md` and the `android-release` skill say what CI builds.

## Waiting for effect-tea

What the move to 0.9.0 found that the runtime could take up, and what each item would change here. An item becomes
a step when a release takes it up, or goes when the runtime rejects it.

- **The types of what a parent's functions take and tell** (`Outputs`, `Tells`), which the package does not export.
  `AddProducts`, `EditProduct` and `Products` each write `Tell` and their step's type by hand, to annotate a
  handler. `AddProducts` builds the table of its `update` at each message, to give one handler the children's
  outputs.
- **A child that the parent's state says is there, and whose model is an `Option`.** `AddProducts` (the date, on
  the second step) and `EditProduct` (the date, past `Loading`) unwrap it with a defect, or a filter, that no state
  reaches.
- **A testing tool for what a step tells.** The whole program's `update` shows the children's states after it, not
  the `tell`: `Products`' test reads the snackbar's `Stamp` command to know how long a notice was told to last.
  `stateOf` takes a child's state that the declaration's `tell` would not give: the arbitraries of `AddProducts`
  and `EditProduct` keep the date's `page` in step with the page by hand.
- **A view's message that names the instance it was drawn for.** The root gives each visit of a page a number, and
  a child by id, for this alone. A child that comes and goes inside a page, as the date of `AddProducts`' second
  step, has no such number: a tap of a frame drawn for an earlier one reaches the one that is there.
- **The parent's `subscriptions`, given the children's outputs.** The back button is each program's that has
  something to close, heard by the last observer (`AGENTS.md`), where the guide keeps in the parent what spans the
  children: a parent cannot list a key by what its children declare.

## Waiting for the owner

- **Home's scroll in the global state.** Every scroll event is a message through `update`, the root's `makeModel`
  and React; the twenty steps of `collapse` soften it. The runtime says what a step at each event costs, and that
  such a value is sent once, as its events end, unless the program follows each. It needs a measurement on a phone,
  with a release build: the emulator keeps no frame rate (`docs/motion.md`). Should frames drop, what follows the
  scroll alone and the program does not decide by is the platform's to keep, moved on the UI thread.
- **AddProducts' clock ticks every second**, to keep the creation date close to the tap: the root's model is made
  every second while the page is shown, and the date is told the time every second while the second step is. The
  command could stamp the product instead, against "the command carries the entity, valid by construction".
- **The contracts on op-sqlite.** The phone's engine is a client written here (`sqlite.op-sqlite.ts`), whose update
  hook every list relies on; every test runs on wa-sqlite, and `docs/testing.md` says so. Running the contracts on
  the emulator needs their checks apart from `bun:test`. To weigh: whether that is worth its cost.
- **The crash screen shows nothing of the cause**, by decision (`src/entrypoints/crash/view.tsx`). The cause goes
  to the log, which a user cannot reach: a crash on a phone cannot be told apart from another. A detail the user
  can copy would still send nothing.
- **One adapter, two test files.** Every service of the storage has one adapter, and "one storage per setup" says
  there is no second. Its contract and the test that runs it could be one file: a change of the `add-service`
  skill's convention.
- **A text field is uncontrolled**, by the `views` skill: its text is `defaultValue`, and a new `key` replaces
  it. The choice was made when the runtime drew no controlled element on React Native. Its bridge now draws a
  controlled `TextInput`, and promises nothing of what it shows until its native view takes the model's value. To
  weigh, on a phone: whether a controlled field keeps up with fast typing. It would let a locked state take a key
  back, and `nameKey` and `replacements` go.
- **What the move to 0.9.0 changed for the user**, each decided in passing and seen on no screen yet (step 1): the
  keypad of a date takes no key until the order of its digits is read; the disc of a product entering the fridge
  is colored by the day it was added on, where it followed the clock during its flight.
