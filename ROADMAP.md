# Roadmap

What is to be done or decided now, and nothing else. A step done is removed, with the reason in the commit: what a
later step needs to know of it is written on that step. The steps come from a review of the architecture that the
owner asked for on 22 November 2026, from the move to effect-tea 0.9.0 on 26 November 2026, which closed the
steps on the root and on the inputs, and what waited for that release, and from a review of the structure on that
same day, for which the owner set every rule of the project aside.

That last review found one thing, which steps 1 and 2 act on, and steps done acted on first. The app has three boundaries where one thing
is put in another's place. A program says what it asks of the world as data, its commands and the keys of its
subscriptions, and `update` is tested with none of it run. The entrypoint, or a test, picks the database's engine,
the HTTP client and the platform's services. The model stands between a program and its view. A boundary beside
these three has one side, and is paid for in files and in rules: a port with the one adapter it will ever have, a
contract for that adapter, a layer in every folder to provide it.

Each step names its model and effort, what it depends on, and how to tell that it is done. Every step also ends
with `bun run typecheck`, `bun run test`, `bun run lint` and `bunx dprint check` passing, and with the documents
that describe what it changed brought up to date (`AGENTS.md`, "Conventions").

## Next, in order

### 1. A large program is modules, by concern

**Model and effort.** Opus 5.5, `high`.

**Depends on** no other step.

**Why.** `home/children/products/program.ts` is 722 lines and `add-products/program.ts` 674 (26 November 2026, once the
back button, the keyboard, the vibrations and the links were written beside their services). Each holds concerns that read each other's state, and so is one program, "however long"
(`AGENTS.md`). The runtime's guide says how such a program is split ("Structuring a program", "Splitting a
program"): into modules of the one program, by concern and never by kind, each with its messages, its commands,
its `update` and the parts of the model it makes, as functions of the whole state. `AGENTS.md` lists what a
program's folder holds, and names no such module: none was written.

**How.**

- The cut is decided reading the two programs as they are. What was seen on 26 November 2026: in
  `Products`, the list with the rows that arrive and leave, the selection with the deletion and its undo, and the
  clock; in `AddProducts`, `AGENTS.md` names the name, the scanner, the lookup and the submission. A concern too
  small to pay for a module stays in `program.ts`.
- `program.ts` keeps the types the program is made from, its declaration, and an `update` that gives each message
  to the one concern that owns it, as the guide's example does.
- A concern's module is private to its folder: Biome keeps a parent from it, as from a child's child.
- The views are not this step's.

**Done when** each message of the two programs is handled in one concern's module; their tests check what they
checked, changed only in what they import; `AGENTS.md` and the `add-program` skill say what a program's folder
holds and when a program is split, by the guide's words.

### 2. `AGENTS.md` holds the rules of every change

**Model and effort.** Opus 5.5, `medium`.

**Depends on** step 1, which rewrites the rules it sorts.

**Why.** "Architecture rules" mixes rules that hold for any program with the design of single features: "Home is
always there, and at most one page is shown over it", "The back button is the program's that has something to do
with it", "A page keeps clear of the keyboard itself", "An expiration is a day of the calendar". They are among
its longest paragraphs, and an agent reads them at every session, whatever it changes. The file's table already
sends a reader to a skill before a kind of change.

**How.** Each such paragraph moves to the document of its feature under `docs/`, or to the skill read before the
change that could break it (`views`, for the keyboard). `AGENTS.md` keeps one line of it where a change made
without it would be a bug, and says where the rest is.

**Done when** every item of "Architecture rules" holds for any program or service; each paragraph moved is reached
from `AGENTS.md`, by its table or by a line; nothing is said in two places.

### 3. Design: the app in the user's language

**Model and effort.** Fable 5.2, `high`: a design, whose steps are then written here, each with its own model.

**Depends on** no other step. The owner is asked first: which languages.

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

### 4. The app on effect-tea 0.9.0, seen on the emulator

**Model and effort.** Opus 5.5, `medium`.

**Depends on** no other step. It comes last, as the owner decided on 26 November 2026: the views are seen once,
as the steps before it leave them.

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
- **The links**, About's and the attribution of a product found: each opens its page, through a command
  (`src/infrastructure/links/`).
- **The root that draws.** The system theme changed while a page over Home is shown keeps that page
  (`src/entrypoints/native.tsx` starts the program itself, for this). The crash screen, and its restart.

**Done when** each item above was seen on the emulator, on a debug build and on a release, and what was found is
fixed, or written here as a step; `docs/motion.md` and `docs/testing.md` say what was seen, and when.

## Any time

None of these waits for the steps above, nor holds them up.

- **What the web build left behind.** Sonnet 5.5, `medium`. `sqlite.memory.ts` is imported only by tests and
  their support, under a name that bundles may import, and `@effect/sql-sqlite-wasm` is a dependency of the app:
  it becomes `sqlite.memory.test_support.ts`, and its package a `devDependency` (`bun install` writes the
  lockfile). Comments still name the browser: `src/infrastructure/back-button/back-button.ts` and `src/libs/dates/date-order.ts`; `tsconfig.json` names `platform-browser`. Done when `browser` is found under
  `src/` only where it is true, `bun run bundle` passes, and `bun run update-licenses` leaves its file as it is.
- **The Android project built on every push.** Opus 5.5, `medium`. CI makes Metro's bundle and Hermes' bytecode,
  and never runs Gradle: the Kotlin of the app's native module
  (`android/app/src/main/java/net/gaudo/fridgy/barcodecamera/`), the codegen, the autolinking and `build.gradle`
  are compiled for the first time by hand, before a release. A job of its own in `.github/workflows/checks.yml`,
  beside the checks, which stay fast: `./gradlew assembleDebug -PreactNativeArchitectures=x86_64`, with Gradle's
  cache and its own timeout. Done when the job is green on a push, which is the owner's to make or to allow, and
  the layers of `docs/testing.md` and the `android-release` skill say what CI builds.
- **One `programs/`, the root's.** Opus 5.5, `medium`. A program two programs use lives in `programs/` of their
  lowest common parent: where it is depends on who uses it, and a third user elsewhere moves it. No parent below
  the root has one (`src/README.md`: "none yet"), and the first would need an override of Biome on that parent's
  folder. A program two programs use goes to `src/app/programs/`, whatever their depth. Done when `AGENTS.md`
  ("Shared things move up, never sideways", the shape of a program), `src/README.md` (the tree, "Visibility"),
  the `add-program` skill and `biome.json` name the root's `programs/` alone.

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
- **The storage's checks on op-sqlite.** The phone's engine is a client written here (`sqlite.op-sqlite.ts`), whose
  update hook every list relies on; every test runs on wa-sqlite, and `docs/testing.md` says so. Running the
  storage's checks on the emulator (the stores' tests: `products.test.ts`, `date-order.test.ts`, and the lookup's cache's, `product-lookup.open-food-facts.test.ts`) needs them apart from `bun:test`. The engine is the one thing of the storage that has two
  implementations: these checks are the contract that has two adapters to run on. To weigh: whether that is worth its cost.
- **The crash screen shows nothing of the cause**, by decision (`src/entrypoints/crash/view.tsx`). The cause goes
  to the log, which a user cannot reach: a crash on a phone cannot be told apart from another. A detail the user
  can copy would still send nothing.
- **How `AGENTS.md` is written.** A review's opinion, of 26 November 2026: its sentences are compressed, and some
  must be worked out before they can be followed ("A page over Home is a child by the number of its visit, never
  used again"). An agent reads the file at every session. To weigh: plain statements, one fact each, as the file
  asks of a comment. It is the owner's voice, so nothing changes it without the owner; step 2 moves paragraphs,
  and rewrites none.
- **A text field is uncontrolled**, by the `views` skill: its text is `defaultValue`, and a new `key` replaces
  it. The choice was made when the runtime drew no controlled element on React Native. Its bridge now draws a
  controlled `TextInput`, and promises nothing of what it shows until its native view takes the model's value. To
  weigh, on a phone: whether a controlled field keeps up with fast typing. It would let a locked state take a key
  back, and `nameKey` and `replacements` go.
- **What the move to 0.9.0 changed for the user**, each decided in passing and seen on no screen yet (step 4): the
  keypad of a date takes no key until the order of its digits is read; the disc of a product entering the fridge
  is colored by the day it was added on, where it followed the clock during its flight.
