# Design: editing a product

Implemented on 2026-10-28, and seen on Android in the emulator the same day (see "Verified, and not").
The code is the page `src/app/children/edit-product/` with its services, the rules of the date entry in
`src/libs/dates/`, the tap on a row in `src/app/children/home/children/products/`, `ProductStore.update` and
`DateOrderStore` in `src/infrastructure/storage/`. Read [`AGENTS.md`](../AGENTS.md), the `add-program`,
`add-service` and `views` skills and the "Guide" of `node_modules/@fgaudo/effect-tea/README.md` before changing
them. The facts about the code below marked **verified** were checked against the tree on 2026-10-28; re-check
them before relying on them.

## What it does

A tap on a product in Home opens a page that shows its name and its expiration date, lets the user change either
or remove the expiration, and saves the product under its id; Home's list then shows it changed, in its new
place. Out of scope: the scanner and the lookup on Open Food Facts on this page, deleting from this page, changing
the creation date, repairing stored data that is not a product (`Invalid` rows), a confirmation before discarding
changes, animating a row that moves in Home's list after an edit (see "Later").

## Decisions

Taken with the owner before the work started; the reasons and the alternatives are in "Open points, and what was
decided".

1. A tap on a product's row in Home opens the page; a long press keeps selecting. Once something is selected, a
   tap selects too, as Material's lists do.
2. The page edits the name and the expiration date; the creation date stays what it was.
3. Of the date entry (the order's segmented button, the digits, the chips of the days they name, the keypad),
   only the rules of typing a date are shared, as functions of `src/libs/dates/digit-date-entry.ts`; each page
   keeps its own model and view of it. A look of Material's that both views draw, with its states, is a utility
   of `src/styles.css`. No module shared under `src/app`.
4. Leaving the page discards the changes without asking.
5. The page's "Save" is a filled button at the bottom, where the thumb rests, as the steps of `add-products`
   have theirs, not a text button in the app bar as Material's full-screen dialog draws it.

## The user's experience

1. **From Home.** A tap on a valid product's row opens "Edit product", which rises from the bottom over Home
   as the page that adds products does. A long press selects the row; once a selection exists, a tap on any row
   selects or deselects it, `Invalid` rows included, and opens nothing; the contextual bar's close button ends the
   selection and gives taps their meaning back. While nothing is selected, a tap does nothing on a row that is
   leaving, on an `Invalid` row (it can only be deleted) and on a `Corrupt` one, and while a deletion is in
   progress.
2. **The page.** Material's full-screen dialog, laid out as the second step of `add-products` is, read from the
   top: the app bar with its close button and the title "Edit product"; the name's outlined text field, with
   the product's name in it and a clear button, not focused (the keyboard would cover the keypad, and the user
   may have come for the date); under it the segmented button of the order the digits are read in, the
   expiration date's field, holding the stored date as digits in that order (empty for a product that never
   expires), and the strip under it; at the bottom, the keypad's panel, and the filled button "Save" docked under
   the column. The fields appear once the order and the time are known, a moment after the page opens (see "The
   program"). The fields' column scrolls when the screen is shorter than it (the keyboard open, a large font), as
   the `android-release` skill says of every page, and "Save" stays in sight, above the navigation bar or the
   keyboard.
3. **The strip** says what the date field means: `No expiration` when the field is empty (the product will not
   expire), the chips of the days the digits name, the stored one drawn selected while the digits are the stored
   date's, or `Not an upcoming date` in the error's colors when the digits name no day the product may expire
   on.
4. **The date.** The keypad types, erases and clears the digits, as on the page that adds products; the
   backspace on the untouched stored date erases its last digit, and the clear key empties the field, which
   removes the expiration. A product that never expired gets one by typing. Picking another order rewrites the
   untouched stored date in that order; digits already typed stay as typed and are read in the new order, as on
   the page that adds products. The days offered are those the digits name on or after the day the product was
   created (`Product.canExpireOn(creationDate)`): a past date can be entered with its year, since the user may
   be correcting a typo or recording a product bought past its date; without a year, a day is the next one on
   or after today, as `DigitDates.datesOf` reads it.
5. **Saving.** "Save" is enabled only while the fields describe a valid product (`Product.make` accepts it)
   that differs from the stored one. A tap disables every control, shows the circular indicator in the button
   and writes the product; when the write has completed, the page leaves, and Home shows the product changed,
   where its new expiration orders it. When the write fails, the page gives the form back and a snackbar says
   `Couldn't save the product`; when nothing is stored under the id any more, the page keeps the form, every
   control disabled but the close button, and its snackbar says `This product no longer exists`; the page leaves
   when that snackbar does. A snackbar of the page leaves by itself after 4 seconds, 16dp above the "Save"
   button, which it never covers.
6. **Leaving.** The app bar's close button and the back button leave the page, the changes discarded, without
   asking, also while it says that the product no longer exists. While the product is being saved, the close
   button is disabled and a press of the back button is held: the page is not left in the middle of a write.

## The date entry: what is shared, and what is not

Typing a date as digits is done by two pages. A program never imports a sibling, so what the two pages have in
common either moves up or is written twice. The criterion, now in `AGENTS.md`, applied layer by layer: a thing is
shared when its truth lies outside the pages that use it, so that a copy changed on its own would be a bug; it is
written twice when the pages may legitimately differ in it, and sharing it would take parameters that describe
the caller.

- **The rules of typing a date** (which keys apply, which days the digits name, which one is the date) know
  nothing of the app: `src/libs/dates/digit-date-entry.ts`, generic as everything under `libs/`. An `Entry` is
  the digits and the day picked among those they name; `typeDigit`, `eraseDigit` and `clear` answer the entry
  after a key, or `None` when the key does not apply (a date's longest already typed, nothing to erase or clear),
  and drop the day picked, as new digits name other days; `offered` reads the days the digits name, in an order
  from a day, among those allowed; `named` is the day picked while still offered, or else the only one offered;
  `choose` answers `None` when the day is not offered or is the one already named, so that a tap on the chosen
  chip does nothing. `digit-dates.ts` has the inverse of `datesOf` for a date's longest form, `digitsOf`
  (`DDMMYYYY` in `DMY`), with the property that `datesOf(digitsOf(date, order), today, order)` is `[date]` for
  every date, order and today (**verified** on `datesOf`: of the four ways to cut eight digits, only two digits
  of day and two of month leave the year 0, 2 or 4 digits, so eight digits name one day at most). In each page,
  a rule answering `None` is `reject` in `update` and a key withheld in the model, so that the model agrees with
  `update` by construction; `dispatchViolations` checks it on the real view.
- **A look of Material's with its states** (a filter chip selected or disabled, a segment current or disabled)
  is Material's, not the pages': the same in both or a bug. The `views` skill puts such looks in `src/styles.css`
  (`filter-chip`, `segment`), their state an attribute they read. A key of the keypad is a line of layout: it
  stays inline, written twice.
- **The composition** (which pieces, in what order, what the strip reads as with no digits, where the button
  is, the model that holds the page's own messages) is each page's. The model's types and the view's pieces
  were copied from `add-products` into the new page, and `add-products` was moved onto the rules first, its
  behaviour unchanged and its tests the net.

## The program (`src/app/children/edit-product/`)

A page of the root, started from flags (**verified**: a program declares `flags` and its `init` becomes a
function of them, `Init<State, Command, Flags>` in `node_modules/@fgaudo/effect-tea/dist/program.d.ts`; the root
starts it with `children.EditProduct.init(flags)` from Home's event). Same shape as every program, no children.

- **The flags are the id and the product the row shows**, valid by construction. The page edits what the user
  saw, and never reads the product again: nothing else writes it while the page is shown (Home's deletion and its
  undo act only from Home, which is under the page), and the storage still has the last word when the page saves
  (see "The service").
- **`Loading` waits for the date order and the clock.** The order comes from the setting's subscription, a
  moment after the page opens, and the stored date cannot be drawn as digits without it; without today, no day
  is offered, so the stored date would show "Not an upcoming date" and "Save" would be withheld for a frame.
  `add-products` draws nothing of the order until it is known and starts with no digits, so it needs no such
  state; here the digits are there from the start. The first order and the first tick make the form, with the
  date `Kept`.
- **`Kept` is a state of the date, not digits computed once.** The digits of an untouched date are derived data
  (the date in the order in use), which the state must not hold, and they must be rewritten when the order
  changes: digits typed as `31122027` in `DMY` and re-read in `MDY` would name no day, on a date the user never
  typed. A key pressed on `Kept` acts on the entry it shows (the stored date's digits in the order in use, none
  for a product that never expires), and the rules then say what applies: on a stored date, the backspace erases
  its last digit and the clear key empties the field, a digit is rejected (eight is a date's longest) and so is a
  tap on its chip (the only day offered, already named); on no stored date, a digit starts typing, and there is
  nothing to erase. A `Some` from a rule becomes `Typed { entry }`.
- **The untouched stored date names the stored expiration itself**, not the day its digits name: a stored date
  that is not at midnight (data written by an older build, or a test's arbitrary) would otherwise read as a
  change. For the same reason "changed" compares expirations by their day, which is what an expiration names,
  and compares the made product, not the typed text: `Product.make` normalizes the name, so a name retyped with
  other spacing is not a change.
- **Only a completion leaves `Saving`**: its controls are disabled, `Saved` outside it is a defect, and a key
  typed just before is kept, as `add-products` does. `Saved` leaves the page; `Failed` gives the form back with
  the snackbar; `Gone` enters `Gone`.
- **`Gone` tells its own failure.** How the user learns of a child's failure stays in that child, so the page
  stays, the form shown and taking no input, until its snackbar has stood its time; its `SnackbarExpired` then
  asks to be left with `LeaveRequested`, as the close and back buttons do at once. Its snackbar stands until the
  page goes: an order not kept is not told over it.
- **Subscriptions**, always on, run by the root only while the page is on top (`subscribed`): the clock every
  30 seconds, as Products' (only `today` is needed, for a date typed without a year; `add-products` ticks every
  second because the creation date is taken from it, which this page never does); the page's own
  `DateOrderSetting`'s changes; the back button, whose press leaves the page, or is held while saving, so that
  the platform does not leave the app.
- **The view** is the app bar and the name field of `add-products`, the latter without the scanner's button and
  the supporting text, and its order segments, date field, strip, chips, keypad and button, copied, with
  `No expiration` as the strip's empty text and the controls disabled while `Saving` and `Gone` (the close button
  stays in `Gone`). `Loading` draws the app bar alone. The page's root is keyed `EditProduct`, rising and sinking as
  `AddProducts` does. No acknowledgement: the page leaves, and the list shows the change.

## Home and its child

`Products` raises the event `EditRequested { id, product }`, the product taken from the item in `update`, so that
no parent reads the child's state; `Home` forwards it, and the root shows the page (`show` ignores the request
when the page is on top, so a double tap opens it once). The model decides what a tap does (`maybeTap` in
`ItemSelection`): opening a `Valid` row while nothing is selected, the row's toggle while selecting, nothing
while deleting, on a leaving row and on `Corrupt` rows; the view attaches whatever message it holds to `click`.

## The service (`src/app/children/edit-product/services/update-product/`)

`UpdateProduct.update(id, snapshot)` writes the snapshot under the id, its expiration added, changed or removed
with it, in one transaction; the pages see the change through the storage's changes, not through this service.
It fails with `UpdateProductError` when the storage could not be written and with `ProductNotStored` when
nothing is stored under the id: the product was deleted since it was opened, an expected state of the world. A
plain effect, not a `RequestResolver`: one product is saved at a time, and nothing batches with it. The sql
adapter parses the id as `DeleteProducts`'s does (only the form an integer is written in, so that `"1 "` is not
`1`), a string that is not an id being `ProductNotStored` too.

### The date order's setting

The page needs the order the digits are read in, which `add-products` keeps in its `DateOrderSetting`. A service
is never shared, so the page has its own `services/date-order-setting/`, the same interface. What the two
adapters must agree on, the setting's key and what its text stands for (the order's `Schema`, the fall-back to
the device's locale), moved up to `DateOrderStore` (`src/infrastructure/storage/date-order.ts`), a service of the
infrastructure on `SettingStore` with `current`, `set` and `tables`, as `ProductStore` is on the `SqlClient`; each
adapter is a few lines on it. The `add-service` skill says it: what a setting's text stands for is its adapter's
own until a second adapter reads it.

## The infrastructure: `ProductStore.update`

`update(id, snapshot)` answers `None` when nothing is stored under the id. In one transaction: the product's row
is updated and read back with `SqlSchema.findOneOption` (`None` ends the transaction, nothing written), then the
expiration is upserted, or deleted when the snapshot has none.

- **Not `repository.update`** of the `SqlModel` repository: **verified** in
  `node_modules/effect/dist/sql/SqlModel.js`, it turns the `NoSuchElementError` of a missing row into a defect
  (`Effect.catchTag("NoSuchElementError", Effect.die)`), and a product deleted since it was opened is an expected
  state of the world, not a bug.
- The upsert relies on `product_expiration.product_id` being `UNIQUE` (**verified** in `migrations.ts`), which
  is already what makes "a product has at most one expiration" true. No migration was needed: the schema does
  not change.
- The creation date is written too, unchanged: the store replaces what is under the id with the snapshot, so
  that its contract is "what is written reads back as itself" and nothing else, and the page's decision to keep
  the creation date stays the page's.

## Open points, and what was decided

- **Sharing the date entry.** Its state, `update` handlers, model and view pieces are about 400 lines in
  `add-products`, which the new page needed nearly as they are. Three ways were weighed with the owner. (a) Share
  only the rules, in `libs/`, and write the rest twice: the state is the rules' `Entry`, the handlers are four
  lines that delegate, the model's fifty lines agree with `update` by construction in each page, and what is truly
  written twice is the view's two hundred lines of TSX, which the utilities of `styles.css` cut to the markup
  alone. (b) A shared child program, in the `programs/` that `AGENTS.md` defines for a program two programs use
  (`src/app/programs/date-entry/`, both pages declaring it as a child): ruled out by the `add-program` skill's own
  test, a child whose state the parent would have to copy down and back up is not one, and `add-products` needs
  the day named in its own `update` to submit, so it would copy it from every event, and hand down the clock, the
  order and the lower bound. (c) A module under `src/app` with no program of its own, holding the model fragments
  and the view pieces generic in the page's message, which the pages fill with their own messages: nothing copied
  up or down and the model agreeing with `update` by the same rules, but a kind of thing `AGENTS.md` rules out
  ("never shared through parameters that describe the caller", "never as fragments of model or view"), and
  pieces that already needed two parameters describing the caller (what the empty strip reads as, whether the
  page takes input), the mark of two things made one. **Decided: (a).** Two uses are too few to know what a third
  would need; the day the creation date gets an entry of its own, moving the entry up is weighed again, with three
  examples instead of one and a half, and the only shape it may then take is (b), a whole program in `programs/`,
  if by then the pages share a state machine and not only its pieces.
- **A tap to open, a long press to select.** Before this change a tap on a row did nothing. Material's lists open
  an item on a tap, select on a long press, and once in selection mode select on a tap: the one behaviour of Home
  this change altered. To check on the device (not in the browser): that Android's long press, which fires
  `contextmenu`, does not also deliver a `click` on release; should it, the row's `click` must be withheld for
  the press that selected it.
- **Discarding changes without asking.** Material's full-screen dialog may confirm before discarding. The app has
  no dialog yet, and prefers an undo to a confirmation; here there is nothing to undo, so the choice is between
  asking and losing a few keystrokes. **Decided: no confirmation**, the edits are short to redo. If the owner
  wants one, it is a state of the page (`ConfirmingDiscard`), closed by the back button first, as the Guide's
  rule for a page's back button says.
- **Dates in the past.** Allowing any day from the creation day on means the chips may offer a day already past,
  which the list will show expired at once. The alternative, only days from today, would forbid correcting a
  product whose date was mistyped as a later one after it had passed, and recording a product bought past its
  date. **Decided: from the creation day**, the domain's own rule.
- **Which fields.** The creation date is not editable: nothing in the UI shows it as a date, only as the
  start of the life the badge's disc colors, and a form for it would need a second date entry. Changing the
  expiration of an old product stretches or shrinks that life, which is what the disc's color means.
- **The product in the flags, not re-read.** The page trusts the row the user tapped. A product that changes
  under the page cannot happen today (nothing writes while Home is covered: `Products`' subscriptions, its undo
  timer included, run only while Home is on top, and its commands only insert or delete, never touch another id),
  and the storage still refuses a save of a deleted product (`ProductNotStored`). Observing the product from the
  page would add a read service for a case the write already handles, and tell it no better than `Gone` does.
- **The fields a moment late.** `Loading` draws the app bar alone until the setting and the clock answer, a
  database read of a few milliseconds under the page's entrance transition. The alternative, drawing the fields
  with an empty date field and a wrong strip for a frame, was judged worse than an honest state.
- **The row's move in the list.** After an edit, Home's list comes back with the product in its new place
  (ordered by expiration, `ProductList`), which snabbdom moves without a transition: a jump. Acceptable for now;
  a FLIP of the rows, measured in hooks as `gatherAndFly` measures, is in "Later".
- **The keyboard over the keypad.** While the name field is focused, the keyboard takes the bottom of the
  viewport (the WebView shrinks: `innerHeight` 914 to 578 on a Pixel 6, seen in the emulator on 2026-10-28), so
  the keypad's panel and the button are below the fold, as the first step's buttons are on the page that adds
  products; a tap on the date field (read-only, `inputMode: 'none'`) dismisses it, and the column scrolls
  meanwhile.

## Verified, and not

The rules, the page, `Products`, the contracts (the update's, and the list seeing an update) and the root's
scenarios are tested (`bun test`); the whole flow was seen in a browser, on the reference screen too (320×640 and
320×533). On Android, in the emulator on 2026-10-28 (API 29 and 37, the Capacitor 9 build): a long press selects
the row and no tap opens the product; a tap opens it; the back button, with the keyboard open, closes the
keyboard first, then the page; on 320×712dp the page fits, and on 320×533dp with the font at 200% its column
scrolls to "Save", keyboard open or not.

## Later, not in this change

- Deleting from the page (an overflow item in the app bar, with Home's snackbar on return).
- The scanner and the lookup on this page, to rename a product from its barcode.
- Editing the creation date ("bought on"), with the disc's meaning in mind: a third date entry, when moving the
  entry up as a program of `programs/` is weighed again.
- Repairing an `Invalid` row (a stored expiration before the creation date) from this page, which today can only
  be deleted: the page would start from an `UnvalidatedSnapshot` and a `fromSnapshot` that forgives the date.
- A transition for a row that moves in Home's list.
- A confirmation before discarding changes, should the owner want one.
