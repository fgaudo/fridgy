# Roadmap

What is to be done or decided now, and nothing else. A step done is removed, with the reason in the commit: what a
later step needs to know of it is written on that step. The steps come from a review of the architecture that the
owner asked for on 22 November 2026, from the move to effect-tea 0.9.0 on 26 November 2026, which closed the
steps on the root and on the inputs, and what waited for that release, from a review of the structure on that
same day, for which the owner set every rule of the project aside, and from the move to effect-tea 0.10.0 on 27
November 2026, which acted on what waited for the runtime. The move to 0.11.0 on 28 November 2026 changed how a
child is declared, and nothing that a view draws. Steps 1 and 4 waited under "Any time" and "Waiting for
the owner", until the owner took them up on 26 November 2026.

That last review found one thing, which steps done acted on. The app has three boundaries where one thing
is put in another's place. A program says what it asks of the world as data, its commands and the keys of its
subscriptions, and `update` is tested with none of it run. The entrypoint, or a test, picks the database's engine,
the HTTP client and the platform's services. The model stands between a program and its view. A boundary beside
these three has one side, and is paid for in files and in rules: a port with the one adapter it will ever have, a
contract for that adapter, a layer in every folder to provide it.

Each step names its model and effort, what it depends on, and how to tell that it is done. Every step also ends
with `bun run typecheck`, `bun run test`, `bun run lint` and `bunx dprint check` passing, and with the documents
that describe what it changed brought up to date (`AGENTS.md`, "Conventions").

## Next, in order

### 1. The name's field, controlled

**Model and effort.** Opus 5.5, `high`: two state machines lose a field, with their properties.

**Depends on** the owner's phone, for the trial. It comes before step 3, which sees the field.

**Why.** A text field is uncontrolled, by the `views` skill: its text is `defaultValue`, and a new `key` replaces
it, which makes the field anew at every clearing and every scan. The choice was made when the runtime drew no
controlled element on React Native. Its bridge now draws a controlled `TextInput`, and promises nothing of what it
shows until its native view takes the model's value. A controlled field would let a locked state take a key back,
and `nameKey` and `replacements` go, from `AddProducts` and `EditProduct`.

**How.** A trial first, and the change only if it passes.

1. **The trial.** In a change that is not committed, the name's field of `AddProducts` alone is drawn controlled
   (`value` where `defaultValue` is), on a release build, on the owner's phone. The owner types: fast, with the
   keyboard's corrections and suggestions, by swiping, with a long press for an accent, with the delete key held;
   then clears, and scans. Looked for: a key lost, a key shown and taken back, a cursor that moves, a word whose
   composition breaks. The emulator's keyboard and `adb shell input text` compose nothing, and prove nothing here.
2. **Passed:** both pages draw the field as the guide says ("What an element gives"; "A controlled element" in
   "Writing a bridge", which says what React Native leaves out). `replacements` and `nameKey` go from the states,
   the models, the tests and the arbitraries. The `views` skill says how a field is drawn, and no longer keys one
   by `nameKey`.
3. **Failed:** the code stays. The `views` skill says what was seen, on which phone and keyboard, and when, so
   that the question is not asked again.

**Done when** the trial failed and the skill says so; or `defaultValue`, `nameKey` and `replacements` are found
nowhere under `src/app`, the skill describes the controlled field, and the owner has typed into both pages' fields
on the phone.

### 2. Design: the app in the user's language

**Model and effort.** Fable 5.2, `high`: a design, whose steps are then written here, each with its own model.

**Depends on** no other step. The owner is asked first: which languages.

**Why.** The texts are English, literals in the views (about 65), in the crash screen, and one in the domain
(`'Undefined name'`, `fromSnapshot`). The dates, the order of a date's digits and the language Open Food Facts is
asked in follow the device. The models hold tags and values, never text, so the views are the only place the texts
are. The crash screen's detail is the cause's text, and is not translated.

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

### 3. The app on effect-tea 0.10.0, seen on the emulator

**Model and effort.** Opus 5.5, `medium`.

**Depends on** step 1, which changes what it looks at. It comes last of the steps that change a view, as the
owner decided on 26 November 2026: the views are seen once, as the steps before it leave them.

**Why.** The moves to 0.9.0 and to 0.10.0 changed every program and every view, and were checked by the tests,
the typecheck, Metro's bundle and Hermes' bytecode alone. No test sees what a view draws, nor what the platform
does with it (`docs/testing.md`).

**How.** As the `android-release` skill says, on a debug build and then a release. What changed, and what to look
at:

- **Home's scroll.** The heights, the offset and the end of a scroll are messages that the view fills, where they
  were inputs: the bar collapses and snaps, the add button shrinks while the list scrolls, a change of the font
  size or of the screen draws the list anew at its top, and Home comes back from a page where it rested.
- **The name's field**, in both pages, as step 1 left it: typing, clearing, a scan that replaces it, a key typed
  just before "Add" and "Save".
- **The date**, drawn by one view for both pages (`src/app/programs/expiration/view.tsx`): the segments, the
  field, the strip and the keypad lay out in each page's column as before. Its keys take nothing until the order
  is read, a moment after the date is first shown: nothing should be seen of it. On `EditProduct` the date is
  there from the page's start, and reads the order while the page waits for the clock: the fields come at the
  first tick. On `AddProducts` it is drawn under the number of its instance: the second step, dismissed and shown
  again, starts with no digits, and a product added from it leaves none for the next.
- **The fridge**, drawn by its own view (`src/app/children/add-products/children/fridge/view.tsx`), with no
  wrapper of its own in the name step's room: the flight of `docs/product-flight.md`.
- **The snackbars** of the three pages, and "Undo". One stands from when it was told: Home's, hidden under a page
  past its time, is gone when Home is back.
- **A page opened twice.** Each visit is another instance of the page, drawn under its number
  (`src/app/view.tsx`): the second shows nothing of the first, its fields' text included.
- **The back button**, which the root alone observes since 0.10.0, and tells to the page shown
  (`src/app/program.ts`), where each program that had something to close observed it. On Home: it closes the menu,
  clears the selection, is held while the selection is deleted, and with nothing open leaves the app. Over Home:
  it closes the scanner and the second step of `AddProducts` first, leaves each page, and is held while a product
  is added or saved. To look at closely: the button is held by the platform exactly while the root observes it
  (`back-button.react-native.ts`), so a press right after a page opens, right after the last thing on Home closes,
  and the first press after the app comes back from the background.
- **The links**, About's and the attribution of a product found: each opens its page, through a command
  (`src/infrastructure/links/`).
- **The root that draws.** The system theme changed while a page over Home is shown keeps that page
  (`src/entrypoints/native.tsx` starts the program itself, for this). The crash screen, the cause it tells,
  and its restart.

**Done when** each item above was seen on the emulator, on a debug build and on a release, and what was found is
fixed, or written here as a step; `docs/motion.md` and `docs/testing.md` say what was seen, and when.

### 4. Home's scroll, seen on a phone

**Model and effort.** Opus 5.5, `medium`: a measurement, and no change to the code.

**Depends on** step 3, for its release build and a scroll already seen on the emulator, and on the owner's phone.

**Why.** Every scroll event is a message through `update`, the root's `makeModel` and React; the twenty steps of
`collapse` soften it. The runtime says what a step at each event costs, and that such a value is sent once, as its
events end, unless the program follows each. The emulator keeps no frame rate (`docs/motion.md`).

**How.**

- Android scrolls the list on the UI thread, whatever the program does. What the program draws may be late: the
  bar's fades and the add button. To check first: whether a late draw drops a frame, or only lags behind the list.
- The frames come from `adb shell dumpsys gfxinfo net.gaudo.fridgy` (`reset` before, as the `android-release`
  skill says), over a list long enough to fling: a slow drag across the headline, a fling, the way back.
- The lag is the owner's to judge, by eye: whether the bar is seen to follow the list late.
- Should frames drop, or the bar be seen late, a step is written here: what follows the scroll alone, and the
  program does not decide by, is the platform's to keep, moved on the UI thread. Where the list rests and whether
  it scrolls stay messages. Otherwise nothing changes.

**Done when** `docs/motion.md` ("Verified, and not") says what was measured and what was seen, on which phone, and
when; and the step that follows is written here, if one does.

## Any time

None of these waits for the steps above, nor holds them up.

- **The Android project built on every push.** Opus 5.5, `medium`. CI makes Metro's bundle and Hermes' bytecode,
  and never runs Gradle: the Kotlin of the app's native module
  (`android/app/src/main/java/net/gaudo/fridgy/barcodecamera/`), the codegen, the autolinking and `build.gradle`
  are compiled for the first time by hand, before a release. A job of its own in `.github/workflows/checks.yml`,
  beside the checks, which stay fast: `./gradlew assembleDebug -PreactNativeArchitectures=x86_64`, with Gradle's
  cache and its own timeout. Done when the job is green on a push, which is the owner's to make or to allow, and
  the layers of `docs/testing.md` and the `android-release` skill say what CI builds.

## Waiting for effect-tea

Nothing waits. What the moves to 0.9.0 and to 0.10.0 found that the runtime could take up is closed: 0.10.0 took up
four items of the first move, and the runtime answered the rest on 27 November 2026, none of which changes the
app. An item found by a later move is written here, with what it would change; it becomes a step when a release
takes it up, or goes when the runtime rejects it.

The answers, so that they are not asked again:

- **A child that may not be there is read as an `Option`**, and `Opt.all` of its model, its output and its
  instance is the one read. Where the state says that it is there, the `None` is a defect of the program
  (`dateShown` of `AddProducts`): a read that the library checked would compile, and die where the `Option` stops
  the mistake.
- **A message passed down a chain of children is the program's logic**: a condition that goes up as an output, and
  a message that goes down in `tell`. A child answers an external message in every state. A `tell` of the step
  that read the child's output reaches the child in that state, which is what the defects of Home's `external` and
  of `Selection.backPressed` rest on. The guide promises it since 0.11.0 ("Rejections and defects").
- **A test wraps a child's message with its instance by hand**: the compiler checks the literal, and the
  `candidates` of a child that is not there are left out (the `add-program` skill, "Tests").

## Waiting for the owner

- **The storage's checks on op-sqlite.** The phone's engine is a client written here (`sqlite.op-sqlite.ts`), whose
  update hook every list relies on; every test runs on wa-sqlite, and `docs/testing.md` says so. Running the
  storage's checks on the emulator (the stores' tests: `products.test.ts`, `date-order.test.ts`, and the lookup's cache's, `product-lookup.open-food-facts.test.ts`) needs them apart from `bun:test`. The engine is the one thing of the storage that has two
  implementations: these checks are the contract that has two adapters to run on. To weigh: whether that is worth its cost.
- **How `AGENTS.md` is written.** A review's opinion, of 26 November 2026: its sentences are compressed, and some
  must be worked out before they can be followed ("A page over Home is a child by the number of its visit, never
  used again"). An agent reads the file at every session. To weigh: plain statements, one fact each, as the file
  asks of a comment. It is the owner's voice, so nothing changes it without the owner.
- **What the move to 0.9.0 changed for the user**, each decided in passing and seen on no screen yet (step 3): the
  keypad of a date takes no key until the order of its digits is read; the disc of a product entering the fridge
  is colored by the day it was added on, where it followed the clock during its flight.
- **What the move to 0.10.0 changed for the user**, decided in passing too: on Home, with the menu open over a
  selection, the back button closes the menu first, then clears the selection, where the press went to whichever
  of the two had opened last. The view opens the menu from the bar that a selection replaces, so no user reaches
  that state today.
