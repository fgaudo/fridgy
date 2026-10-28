# Design: editing a product

Status: designed on 2026-10-28, implemented on 2026-10-28, with the departures listed in "As implemented"; not
yet seen on Android (see "Known gaps" in `AGENTS.md`). This document was the brief for whoever implemented it, person or
agent: read [`AGENTS.md`](../AGENTS.md), the `add-program`, `add-service` and `views` skills and the "Guide" of
`node_modules/@fgaudo/effect-tea/README.md` first; their rules apply to every part of this change and are not
repeated here. The facts about the code below (what the storage can do, what the runtime offers) were checked
against the tree on 2026-10-28 and are marked **verified**; re-check them before relying on them.

Decisions taken with the owner, before the work starts (see "Open points" for the reasons and the alternatives):

1. A tap on a product's row in Home opens the page; a long press keeps selecting. Once something is selected, a
   tap selects too, as Material's lists do.
2. The page edits the name and the expiration date; the creation date stays what it was.
3. Of the date entry (the order's segmented button, the digits, the chips of the days they name, the keypad),
   only the rules of typing a date are shared, as functions of `src/libs/dates/digit-date-entry.ts`; each page
   keeps its own model and view of it. A look of Material's that both views draw, with its states, becomes a
   utility of `src/styles.css` where the list of classes earns it. No module shared under `src/app`.
   `add-products` moves onto the rules first, its behaviour unchanged and its tests the net.
4. Leaving the page discards the changes without asking.
5. The page's "Save" is a filled button at the bottom, where the thumb rests, as the steps of `add-products`
   have theirs, not a text button in the app bar as Material's full-screen dialog draws it.

## Goal and scope

Today a stored product can only be deleted (`src/app/children/home/children/products`). After this change, a
tap on a product in Home opens a page that shows its name and its expiration date, lets the user change either
or remove the expiration, and saves the product under its id; Home's list then shows it changed, in its new
place.

In scope: the way from Home to the page, the rules of the date entry in `libs/` and the move of `add-products`
onto them, the page (program, view, layer, tests), its services (the write, and the date order's setting, its
own copy), what the storage needs to update a product, the root's wiring and tests, the docs.

Out of scope, for later changes (see "Later"): the scanner and the lookup on Open Food Facts on this page,
deleting from this page, changing the creation date, repairing stored data that is not a product (`Invalid`
rows), a confirmation before discarding changes, animating a row that moves in Home's list after an edit.

## The user's experience

1. **From Home.** A tap on a valid product's row opens "Edit product", which rises from the bottom over Home
   as the page that adds products does. A long press selects the row, as today; once a selection exists, a tap
   on any row selects or deselects it, and opens nothing; the contextual bar's close button ends the selection
   and gives taps their meaning back. A tap does nothing on a row that is leaving, on an `Invalid` row (it can
   only be deleted) and on a `Corrupt` one, and while a deletion is in progress.
2. **The page.** Material's full-screen dialog, laid out as the second step of `add-products` is, read from the
   top: the app bar with its close button and the title "Edit product"; the name's outlined text field, with
   the product's name in it and a clear button, not focused (the keyboard would cover the keypad, and the user
   may have come for the date); under it the segmented button of the order the digits are read in, the
   expiration date's field, holding the stored date as digits in that order (empty for a product that never
   expires), and the strip under it; docked at the bottom, the keypad's panel and the filled button "Save". The
   fields appear once the order is known, a moment after the page opens (see "State").
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
   where its new expiration orders it. When the write fails, the page gives the form back and a toast says
   `Couldn't save the product`; when nothing is stored under the id any more, a toast says
   `This product no longer exists` and the page leaves.
6. **Leaving.** The app bar's close button and the back button leave the page, the changes discarded, without
   asking. While the product is being saved, the close button is disabled and a press of the back button is
   held: the page is not left in the middle of a write.

## The date entry: what is shared, and what is not

Typing a date as digits is done by two pages, and `add-products` has it all today: the state of the digits and
of the day picked, the `update` handlers of the keypad and the chips, the model's `DateShown`, `DateChoice` and
`OrderChoice`, and the view's pieces. A program never imports a sibling, so what the two pages have in common
either moves up or is written twice. The criterion, applied layer by layer: a thing is shared when its truth lies
outside the pages that use it, so that a copy changed on its own would be a bug; it is written twice when the
pages may legitimately differ in it, and sharing it would take parameters that describe the caller.

- **The rules of typing a date** (which keys apply, which days the digits name, which one is the date) know
  nothing of the app: `src/libs/dates`, below.
- **A look of Material's with its states** (a filter chip selected or disabled, a segment current or disabled)
  is Material's, not the pages': the same in both or a bug. The `views` skill already puts such looks in
  `src/styles.css` (`state-layer`, `scrim`, `freshness-badge`); the chip's and the segment's lists of classes, four
  conditional lines each, become utilities there in the step that touches `add-products`. A key of the keypad is
  a line of layout: it stays inline, written twice. Decide each one on its list of classes, not in advance.
- **The composition** (which pieces, in what order, what the strip reads as with no digits, where the button
  is, the model that holds the page's own messages) is each page's. The model's types and the view's pieces
  are copied from `add-products` into the new page, and each page's model agrees with its `update` by
  construction, since both call the same rule (`typeDigit` answering `None` is `reject` in `update` and a key
  withheld in the model), and `dispatchViolations` checks it on the real view, as it does today.

A shared module of model fragments and view pieces under `src/app`, generic in the page's message, was designed and set
aside: `AGENTS.md` now rules it out ("never shared through parameters that describe the caller"), and says where the one
thing that moves up as it is goes, a whole program two programs use, into `programs/` of their lowest common parent,
which the date entry is not today (see "Open points").

### The rules: `src/libs/dates/digit-date-entry.ts`

Generic, as everything under `libs/`: it knows digits, dates and orders, nothing of products or pages.

```ts
export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

/** A date being typed: the digits, and the day picked among those they name, until a key changes them. */
export type Entry = Readonly<
  { digits: string; maybeChosenDate: Opt.Option<DateTime.Utc> }
>

export const empty: Entry

/**
 * The entry after a key, or `None` when the key does not apply: a date's longest already typed, nothing to erase
 * or clear.
 */
export const typeDigit: (digit: Digit) => (entry: Entry) => Opt.Option<Entry>
export const eraseDigit: (entry: Entry) => Opt.Option<Entry>
export const clear: (entry: Entry) => Opt.Option<Entry>

/** The days the digits name, read in `order` from `today` (`DigitDates.datesOf`), among those `isAllowed`. */
export const offered: (
  entry: Entry,
  today: DateTime.Utc,
  order: DateOrder,
  isAllowed: (date: DateTime.Utc) => boolean,
) => ReadonlyArray<DateTime.Utc>

/** The day the entry names: the one picked, while still offered, or else the only one offered. */
export const named: (
  entry: Entry,
  offered: ReadonlyArray<DateTime.Utc>,
) => Opt.Option<DateTime.Utc>

/**
 * The entry with `date` picked, or `None` when it is not offered or is the day already named: a tap on the chosen
 * chip does nothing.
 */
export const choose: (
  date: DateTime.Utc,
  offered: ReadonlyArray<DateTime.Utc>,
) => (entry: Entry) => Opt.Option<Entry>
```

`typeDigit`, `eraseDigit` and `clear` drop the day picked, as `add-products` does today ("new digits name other
days"). `digit-dates.ts` gains the inverse of `datesOf` for a date's longest form:

```ts
/** The digits that name `date` alone in `order`, a date's longest form (`DDMMYYYY` in `DMY`). */
export const digitsOf: (date: DateTime.Utc, order: DateOrder) => string
```

with the property `datesOf(digitsOf(date, order), today, order)` is `[date]` for every date, order and today
(**verified** on `datesOf`: of the four ways to cut eight digits, only two digits of day and two of month leave
the year 0, 2 or 4 digits, so eight digits name one day at most).

### `add-products` on the rules

A refactoring with no change of behaviour, done before the page: `DateForm` becomes `Entry`; `DigitTyped`,
`DigitErased`, `DateCleared` and `DateChosen` delegate to the rules, `None` being `reject`; `datesOf` and
`maybeNamedDate` become `offered` (with `isAllowed: Product.canExpireOn(now)`) and `named`; `Digit` is imported
from `libs/dates` and re-exported by the page's `program.ts` as a type, for `user.test_support.ts`. The model's
types, `makeModel`'s `dateShown` and the view's pieces stay the page's, touched only where the chip and the
segment take their utilities. The page's tests keep passing, their helpers (`offeredDates`, `withDate`) moved
onto the rules.

## The program (`src/app/children/edit-product/`)

A page of the root, started from flags (**verified**: a program declares `flags` and its `init` becomes a
function of them, `Init<State, Command, Flags>` in `node_modules/@fgaudo/effect-tea/dist/program.d.ts`; a parent
starts it with `children.EditProduct.init(flags)`). Same shape as every program (`program.ts`, `view.tsx`,
`layer.ts`, tests, `services/`), no children.

### Flags

```ts
export type Flags = Readonly<{ id: string; product: Product.Product }>
```

The id is the storage's, as `ProductList` gives it (a string); the product is the one the row shows, valid by
construction. The page edits what the user saw, and never reads the product again: nothing else writes it while
the page is shown (Home's deletion and its undo act only from Home, which is under the page), and the storage
still has the last word when the page saves (see "The service").

### State

```ts
/** What is kept while the product is edited and while it is saved: a save that fails gives the form back. */
export type Form = Readonly<{
  id: string
  /** The product as it was opened: what the fields started from, and what "changed" is measured against. */
  original: Product.Product
  /** The name as typed; whether it is a name is decided when saving. */
  name: string
  /** How many times the name's input was drawn anew: with each clearing. */
  replacements: number
  /** The current time, once the clock has ticked: a date typed without a year is read from today. */
  maybeNow: Opt.Option<DateTime.Utc>
  /** The order the digits of a date are read in: known, once the page is editing. */
  order: DateOrder.DateOrder
  date: DateForm
}>

/** The expiration date, as stored until a key is pressed, then as typed. */
export type DateForm = Data.TaggedEnum<{
  /** The stored expiration, or none: shown as its digits in the order in use, rewritten when the order changes. */
  Kept: object
  Typed: Readonly<{ entry: DigitDateEntry.Entry }>
}>

export type State = Data.TaggedEnum<{
  /** Until the order the digits are read in is known: the fields are not drawn without it. */
  Loading: Readonly<
    {
      id: string
      original: Product.Product
      maybeNow: Opt.Option<DateTime.Utc>
    }
  >
  Editing: Readonly<{ form: Form }>
  /** The product is being saved: only its completion leaves this state. */
  Saving: Readonly<{ form: Form; product: Product.Product }>
}>
```

- `Loading` exists because the order comes from the setting's subscription, a moment after the page opens, and
  the stored date cannot be drawn as digits without it. `add-products` draws nothing of the order until it is
  known and starts with no digits, so it needs no such state; here the digits are there from the start. The
  first `OrderChanged` makes the form, with `date: Kept`.
- `Kept` is a state of its own, not digits computed once, because the digits of an untouched date are derived
  data (the date in the order in use), which the state must not hold, and because they must be rewritten when
  the order changes: digits typed as `31122027` in `DMY` and re-read in `MDY` would name no day, on a date the
  user never typed. A key pressed on `Kept` acts on the entry it shows:

  ```ts
  /**
   * The entry the fields show: the stored date's digits in the order in use, none for a product that never expires,
   * or the one typed.
   */
  const entryOf = (form: Form): DigitDateEntry.Entry =>
    form.date._tag === 'Typed'
      ? form.date.entry
      : {
        digits: Opt.match(form.original.maybeExpirationDate, {
          onNone: () => '',
          onSome: (date) => DigitDates.digitsOf(date, form.order),
        }),
        maybeChosenDate: Opt.none(),
      }
  ```

  and the rules then say what applies: on a stored date, the backspace erases its last digit and the clear key
  empties the field, a digit is rejected (eight is a date's longest) and so is a tap on its chip (the only day
  offered, already named); on no stored date, a digit starts typing, and there is nothing to erase.

### Messages

```ts
export type Message = Data.TaggedEnum<{
  // From the view.
  NameChanged: { name: string }
  /** The name field's clear button: empties the name. */
  NameCleared: object
  DigitTyped: { digit: Digit }
  DigitErased: object
  /** The keypad's clear key: erases every digit, which removes the expiration. */
  DateCleared: object
  /** Picks, among the days the digits name, the one the product expires on. */
  DateChosen: { date: DateTime.Utc }
  /** The segmented button: the order the digits are read in, kept for every date to come. */
  OrderPicked: { order: DateOrder.DateOrder }
  /** Saves the product the fields describe. */
  SaveStarted: object
  /** The app bar's close button. */
  Closed: object
  // From subscriptions.
  TimeChanged: { now: DateTime.Utc }
  OrderChanged: { order: DateOrder.DateOrder }
  /** The platform's back button, while the page is shown. */
  BackPressed: object
  // From commands.
  OrderKept: { succeeded: boolean }
  Saved: { outcome: 'Saved' | 'Failed' | 'Gone' }
}>

export type Command = Data.TaggedEnum<{
  /** Writes a product that `update` has already validated, under its id. */
  Save: { id: string; product: Product.Product }
  KeepOrder: { order: DateOrder.DateOrder }
  ShowToast: { text: string }
}>

export type Event = Data.TaggedEnum<{ LeaveRequested: object }>

export type Deps = UpdateProduct | DateOrderSetting | Notifications | BackButton
```

### `update`

The product the fields describe, in `Editing` and `Saving`:

```ts
const offeredDates = (form: Form) =>
  Opt.match(form.maybeNow, {
    onNone: () => [],
    onSome: (now) =>
      DigitDateEntry.offered(
        entryOf(form),
        now,
        form.order,
        Product.canExpireOn(form.original.creationDate),
      ),
  })

/** The expiration the fields name: none on no digits; `None` when the digits name no day the product may expire on. */
const maybeNamedExpiration = (
  form: Form,
): Opt.Option<Opt.Option<DateTime.Utc>> =>
  entryOf(form).digits === ''
    ? Opt.some(Opt.none())
    : Opt.map(DigitDateEntry.named(entryOf(form), offeredDates(form)), Opt.some)

const productOf = (form: Form): Opt.Option<Product.Product> =>
  Opt.flatMap(
    maybeNamedExpiration(form),
    (maybeExpirationDate) =>
      Product.make({
        name: form.name,
        creationDate: form.original.creationDate,
        maybeExpirationDate,
      }),
  )

const isChanged = (form: Form, product: Product.Product) =>
  product.name !== form.original.name
  || !Opt.getEquivalence(DateTime.Equivalence)(
    product.maybeExpirationDate,
    form.original.maybeExpirationDate,
  )
```

`isChanged` compares the made product, not the typed text: `Product.make` normalizes the name, so a name retyped
with other spacing is not a change. The keys of the entry act on `entryOf(form)` through the rules, and a
`Some` becomes `Typed { entry }`.

In `Loading`, only `TimeChanged` (sets `maybeNow`), `OrderChanged` (makes the form: `Editing`), `Closed` and
`BackPressed` (the event `LeaveRequested`) apply; a message of the view's other controls is rejected, the
command's `OrderKept` and `Saved` are defects. In `Saving`, everything below is rejected unless said otherwise:
its controls are disabled, and a completion is the only way out.

- `NameChanged`: sets `name`, in `Saving` too, so that a key typed just before is kept, as `add-products` does.
- `NameCleared`: with a non-empty name, `name: ''` and `replacements + 1`; else reject.
- `DigitTyped`, `DigitErased`, `DateCleared`: `typeDigit(digit)`, `eraseDigit`, `clear` on `entryOf(form)`;
  `Some(entry)` gives `Typed { entry }`, `None` is reject.
- `DateChosen`: `choose(date, offeredDates(form))` on `entryOf(form)`, the same way.
- `OrderPicked`: when `order` differs from the one in use, sets `order` and commands `KeepOrder`; else reject.
  `Kept` is then shown in the new order; a `Typed` entry stays as typed.
- `SaveStarted`: when `productOf(form)` is `Some(product)` and `isChanged`, `Saving { form, product }` and the
  command `Save { id, product }`; else reject.
- `Closed`: the event `LeaveRequested`; in `Saving`, reject (the button is disabled).
- `BackPressed`: the event `LeaveRequested`; in `Saving`, `{ state }`: held, so that the platform does not leave
  the app.
- `TimeChanged`, `OrderChanged`: set `maybeNow`, `order`, in `Editing` and `Saving` alike.
- `OrderKept`: nothing when it succeeded; else the command `ShowToast('Couldn't save the date order')`, in
  `Editing` and `Saving` alike.
- `Saved`: in `Editing`, a **defect**, since only a completion leaves `Saving`. In `Saving`: `Saved` gives
  `Editing { form }` with the event `LeaveRequested`; `Failed` gives `Editing { form }` and the toast
  `Couldn't save the product`; `Gone` gives `Editing { form }`, the toast `This product no longer exists` and the
  event `LeaveRequested`.

### Subscriptions

- `clock`: `DateTime.now` every 30 seconds, as Products' (only `today` is needed, for a date typed without a
  year; `add-products` ticks every second because the creation date is taken from it, which this page never
  does). Always on.
- `date-order`: the page's own `DateOrderSetting`'s `changes`. Always on: the first message ends `Loading`.
- `back-button`: always on, as `add-products`: a press leaves the page, or is held while saving.

The root runs them only while the page is on top (`subscribed`, through `page('EditProduct')`).

### Commands

`save` reads `UpdateProduct`, requests `update(id, Product.toSnapshot(product))` under the log span `SaveProduct`,
logs the failure at `warn` and the success at `info`, and answers `Saved { outcome }` with `Effect.match` and
`Effect.asSome`: `Gone` on `ProductNotStored`, `Failed` on `UpdateProductError`. `keepOrder` and `showToast` are
`add-products`'s, copied.

### The model

The page's own, copied from `add-products` and trimmed: `DateChoice`, `OrderChoice` and a `DateShown` without the
heading's `name`, whose strip is `Empty | Naming | NamingNothing` (`Empty` reads as "No expiration" in this view,
as a hint in the other's).

```ts
export type Model = Data.TaggedEnum<{
  Loading: Readonly<{ close: Message }>
  Editing:
    & DateShown
    & Readonly<{
      close: Message
      name: string
      nameKey: number
      changeName: (name: string) => Message
      maybeClearName: Opt.Option<Message>
      maybeTypeDigit: Opt.Option<(digit: Digit) => Message>
      maybeEraseDigit: Opt.Option<Message>
      maybeClearDate: Opt.Option<Message>
      /** Saves, once the fields describe a product other than the stored one. */
      maybeSave: Opt.Option<Message>
    }>
  Saving: DateShown & Readonly<{ name: string; nameKey: number }>
}>
```

`makeModel` builds `DateShown` from `entryOf(form)`, `offeredDates(form)` and `named`, with `isAllowed:
Product.canExpireOn(original.creationDate)`; each `maybe*` is `Some` exactly where the rule answers `Some` on
the entry shown (`typeDigit` for some digit, `eraseDigit`, `clear`, `choose` for each offered day), and `None`
throughout `Saving`. For `Kept` of a product that expires, the strip is `Naming` with one chip, `Chosen`: the
eight digits name that day alone, and `named` picks the only day offered.

### The view

The app bar and the name field of `add-products`, the latter without the scanner's button, the lookup's
indicator and the supporting text; its `orderSegments`, `dateField`, `strip`, `chip`, `keypad` and `button`,
copied, the chip and the segment on the utilities of `src/styles.css`, with `'No expiration'` as the strip's
empty text, the controls disabled while `Saving` and "Save" showing `Progress` then. `Loading` draws the app bar
alone. The page's root is keyed `EditProduct`, `fixed inset-0 z-70`, rising and sinking as `AddProducts` does.
No acknowledgement: the page leaves, and the list shows the change.

## Home and its child

`Products` (`src/app/children/home/children/products/program.ts`) gains:

- a message `EditRequested { id }`, accepted when the list is loaded, the id is a `Valid` item's, not leaving,
  and the selection is `Idle`: it raises the event `EditRequested { id, product }`, the product taken from the
  item in `update`, so that no parent reads the child's state; rejected otherwise;
- an `Event` type (it has none today), and the program's type lists `event`;
- in `ItemSelection`, beside `maybeToggle`, `maybeTap: Opt.Option<Message>`: `EditRequested` while the selection
  is `Idle`, the row's `ItemSelected` or `ItemDeselected` while it is `Selecting`, `None` while deleting, on a
  leaving row, on `Invalid` and `Corrupt` rows. The model decides what a tap does; the view attaches whatever
  message it holds to `click`.

`Home` declares `onEvent.Products`, forwarding `EditRequested` as an event of its own, `Event.EditRequested
{ id, product }`, and nothing else changes there.

The root (`src/app/program.ts`): `Page` gains `EditProduct { state }`, `onEvent.Home.EditRequested` shows it with
`show(state, 'EditProduct', children.EditProduct.init({ id, product }))` (`show` already ignores the request when
the page is on top, so a double tap opens it once), `onEvent.EditProduct` leaves it, `makeModel` draws it; the
root view keys it by name; `src/app/layer.ts` merges its layer; `user.test_support.ts`'s `back` matches the new
page.

## The service (`src/app/children/edit-product/services/update-product/`)

```ts
/** The storage could not be written. */
export class UpdateProductError
  extends Data.TaggedError('UpdateProductError')<{ readonly cause: unknown }>
{}

/** Nothing is stored under the id: the product was deleted since it was opened. */
export class ProductNotStored
  extends Data.TaggedError('ProductNotStored')<{ readonly id: string }>
{}

/** Replaces a stored product; the pages see the change through the storage's changes, not through this service. */
export class UpdateProduct extends Context.Service<
  UpdateProduct,
  {
    /** Writes `snapshot` under `id`, its expiration added, changed or removed with it, in one transaction. */
    readonly update: (
      id: string,
      snapshot: Product.Snapshot,
    ) => Effect.Effect<void, UpdateProductError | ProductNotStored>
  }
>()('<hashed key>') {}
```

A plain effect, not a `RequestResolver`: one product is saved at a time, and nothing batches with it. The sql
adapter parses the id as `DeleteProducts`'s does (only the form an integer is written in, so that `"1 "` is not
`1`), an id that was never written being `ProductNotStored`, and calls `ProductStore.update`.

The contract (`update-product.test_contract.ts`, run on `sqlite.memory` with
`#infrastructure/storage/products.test_support.ts`): a product updated reads back as the snapshot written (name,
creation date, expiration); an expiration is added to a product that had none, changed, and removed, with no
row left in `product_expiration` (through `readBack`, which joins it); the other products are untouched; an id
that was never written, and a string that is not an id, fail with `ProductNotStored` and change nothing. The
`ProductList` contract gains a case: the list sees an update, with the product in its new place.

### The date order's setting

`edit-product` needs the order the digits are read in, which `add-products` keeps in its `DateOrderSetting`. A
service is never shared, so the page gets its own `services/date-order-setting/`, the same interface. What the two
adapters must agree on, the setting's key and what its text stands for (the order's `Schema`, the fall-back to the
device's locale), is shared and moves up, to `src/infrastructure/storage/date-order.ts`, on `SettingStore`:
`current` (read, decode, fall back) and `set`, plus the `tables` to react to. Each adapter becomes a few lines:
`Source.fromStream(sql.reactive(tables, current))` and `set` mapped to its own error. The `add-service` skill
says today that "what a setting's text stands for is its adapter's own": the sentence becomes "until a second
adapter reads it: then it moves to the infrastructure, as the date order's did".

## The infrastructure: `ProductStore.update`

`src/infrastructure/storage/products.ts` gains, beside `insert` and `deleteById`:

```ts
/** Writes a product under `id`, its expiration with it; `None` when nothing is stored under `id`. */
const update: (
  id: Integer.Integer,
  snapshot: { name; creationDate; maybeExpirationDate },
) => Effect<Option<void>, SqlError>
```

In one transaction: `UPDATE product SET name = ?, creation_date = ? WHERE id = ? RETURNING id`, read with
`SqlSchema.findOneOption` (`None` ends the transaction, nothing written), then, for `Some(date)`,
`INSERT INTO product_expiration (date, product_id) VALUES (?, ?) ON CONFLICT (product_id) DO UPDATE SET date =
excluded.date`, and for `None`, `DELETE FROM product_expiration WHERE product_id = ?`.

- **Not `repository.update`** of the `SqlModel` repository: **verified** in
  `node_modules/effect/dist/sql/SqlModel.js`, it turns the `NoSuchElementError` of a missing row into a defect
  (`Effect.catchTag("NoSuchElementError", Effect.die)`), and a product deleted since it was opened is an expected
  state of the world, not a bug.
- The upsert relies on `product_expiration.product_id` being `UNIQUE` (**verified** in `migrations.ts`), which
  is already what makes "a product has at most one expiration" true. No migration is needed: the schema does
  not change.
- The creation date is written too, unchanged: the store replaces what is under the id with the snapshot, so
  that its contract is "what is written reads back as itself" and nothing else, and the page's decision to keep
  the creation date stays the page's.

## Tests

- `src/libs/dates/digit-dates.test.ts`: `digitsOf` names its date alone, in every order. `digit-date-entry.test.ts`:
  each rule's `None` cases, `named` the picked day while offered and else the only one, `choose` rejecting the
  day named.
- `add-products/program.test.ts`: unchanged in what it checks; its helpers move onto the rules.
- `edit-product/program.test.ts`, as the `add-program` skill says, with `program.test_arbitrary.ts` building
  forms from the domain's arbitraries: `update` total and deterministic; the view sends what `update` accepts,
  all of it, with the candidates listed (the typed names, every digit, the chips of the offered days, the
  orders, save, close) and the double tap acting once; one test per message, by value; the model: `Kept` draws
  the stored date in the order in use, rewritten when the order changes, and its one chip chosen; each key is
  offered exactly where its rule applies to the entry shown; `Save` is withheld on an unchanged product, on a
  blank name and on digits naming no day, and offered on each kind of change (name, date, expiration added,
  expiration removed); a day before the creation day is never offered, a day between the creation day and
  today is; `Loading` ends with the first order; the subscriptions, always three; `Saved` outside `Saving` is a
  defect.
- `products/program.test.ts`: `EditRequested` raises the event with the item's product, and is rejected on a
  selection, a deletion, a leaving row, an `Invalid` id; `maybeTap` is the toggle while selecting.
- `src/app/program.test.ts`, through `user.test_support.ts` (`openProduct`, `typeEditedName`, `saveProduct`):
  a tap on the first sample product opens the page on top with that product, and the order heard ends its
  loading; its name saved, the page leaves and Home's list shows the new name under the same id; its expiration
  cleared, the product is listed last, everlasting; the back button leaves the page with the product as it was;
  a tap while a product is selected selects instead of opening.
- The contracts above; `date-order.ts`'s behaviour through both adapters' contract runs.

## Documentation to update with the change

`README.md` (status: the edit page), `src/README.md` (the tree: `edit-product` and its services,
`infrastructure/storage/date-order.ts`, `libs/dates`' entry), `AGENTS.md` ("Known gaps": the page not yet seen on
Android; the criterion for what moves up is already there, since 1b434df), the `add-program` skill ("A page of the
root": one started from flags, `children.<Page>.init(flags)` in `onEvent`), the `add-service` skill (the setting's text
shared by two adapters), the `views` skill (when a list of classes becomes a utility: a look of Material's with its
states, drawn by more than one view; Material's list: a tap opens an item, a long press selects, a tap selects once
something is).

## Order of work

Each step leaves the typecheck, the lint and the tests green:

1. `src/libs/dates/`: `digitsOf`, `digit-date-entry.ts`, their tests.
2. `add-products` moved onto the rules, its tests green with no change in what they check; the chip's and the
   segment's utilities in `src/styles.css`, with the `views` skill's line on when a utility is due.
3. `src/infrastructure/storage/date-order.ts`; `add-products`'s `date-order-setting.sql.ts` on it, its contract
   unchanged and green.
4. `ProductStore.update`, and its test support if `readBack` is not enough.
5. The service, its adapter, the contract and the adapter's test; the `ProductList` contract's new case.
6. The page: program, arbitraries, view, layer, tests.
7. `Products` (`EditRequested`, `maybeTap`, the event), `Home` (forwarding), the root (page, wiring, view), the
   test support and the root's tests.
8. The docs. Then in the browser: the whole flow at 375×812 and 320×568, light and dark, the keyboard up over
   the keypad, and `add-products` as before; on Android (with the Capacitor 9 build from "Known gaps"): that a
   long press does not also fire a tap, and that the back button, with the keyboard open, closes the keyboard
   first.

## As implemented

Where the code departs from the design above, and why:

- **`Loading` waits for the clock too**, and `Form` holds `now`, not `maybeNow`. Without today, no day is offered:
  the stored date would show "Not an upcoming date" and "Save" would be withheld for a frame, the wrong strip the
  design itself judged worse than an honest state.
- **The untouched stored date names the stored expiration itself**, not the day its digits name: a stored date
  that is not at midnight (data written by an older build, or a test's arbitrary) would otherwise read as a change.
  For the same reason `isChanged` compares expirations by their day, which is what an expiration names.
- **A tap on an `Invalid` row selects it once something is selected**, as on any other row: `maybeTap` is the
  toggle whenever the selection is `Selecting`, and opens only a `Valid` row, while nothing is selected.
- **`DateOrderStore`** (`src/infrastructure/storage/date-order.ts`) is a service of the infrastructure on
  `SettingStore`, with `current`, `set` and `tables`, as `ProductStore` is on the `SqlClient`.
- **The fields' column scrolls** when the screen is shorter than it: at 320×568 the keypad's last row and "Save"
  were out of reach, the page being fixed and its column not scrolling. The second step of `add-products` had the
  same height and got the same scroll. The narrowest screen is now stated in the `android-release` skill.

## Open points, and what was decided

- **Sharing the date entry.** Its state, `update` handlers, model and view pieces are about 400 lines in `add-products`,
  which the new page needs nearly as they are. Three ways were weighed with the owner. (a) Share only the rules, in
  `libs/`, and write the rest twice: the state is the rules' `Entry`, the handlers are four lines that delegate, the
  model's fifty lines agree with `update` by construction in each page, and what is truly written twice is the view's
  two hundred lines of TSX, which the utilities of `styles.css` cut to the markup alone. (b) A shared child program, in
  the `programs/` that `AGENTS.md` now defines for a program two programs use (`src/app/programs/date-entry/`, both
  pages declaring it as a child): ruled out by the `add-program` skill's own test, a child whose state the parent would
  have to copy down and back up is not one, and `add-products` needs the day named in its own `update` to submit, so it
  would copy it from every event, and hand down the clock, the order and the lower bound. (c) A module under `src/app`
  with no program of its own, holding the model fragments and the view pieces generic in the page's message, which the
  pages fill with their own messages: nothing copied up or down and the model agreeing with `update` by the same rules,
  but a kind of thing `AGENTS.md` now rules out ("never shared through parameters that describe the caller", "never as
  fragments of model or view"), and pieces that already needed two parameters describing the caller (what the empty
  strip reads as, whether the page takes input), the mark of two things made one. **Decided: (a).** The owner's rule,
  now in `AGENTS.md` and the `add-program` skill: a thing is shared when its truth lies outside the pages that use it
  (the rules, Material's looks), and written twice when the pages may legitimately differ in it (the composition). Two
  uses are too few to know what a third would need; the day the creation date gets an entry of its own, moving the entry
  up is weighed again, with three examples instead of one and a half, and the only shape it may then take is (b), a
  whole program in `programs/`, if by then the pages share a state machine and not only its pieces.
- **A tap to open, a long press to select.** Today a tap on a row does nothing. Material's lists open an item on a
  tap, select on a long press, and once in selection mode select on a tap; this is what point 1 adopts, and it is
  the one behaviour of Home this change alters. To check on the device (not in the browser): that Android's long
  press, which fires `contextmenu`, does not also deliver a `click` on release; should it, the row's `click` must
  be withheld for the press that selected it.
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
  freshness ring's start, and a form for it would need a second date entry. Changing the expiration of an old
  product stretches or shrinks that ring, which is what the ring means.
- **The product in the flags, not re-read.** The page trusts the row the user tapped. A product that changes
  under the page cannot happen today (nothing writes while Home is covered: `Products`' subscriptions, its undo
  timer included, run only while Home is on top, and its commands only insert or delete, never touch another id),
  and the storage still refuses a save of a deleted product (`ProductNotStored`). Observing the product from the
  page would add a read service and a `Gone` state for a case the write already handles.
- **The fields a moment late.** `Loading` draws the app bar alone until the setting answers, a database read of a
  few milliseconds under the page's entrance transition. The alternative, drawing the fields with an empty date
  field and a wrong strip for a frame, was judged worse than an honest state.
- **The row's move in the list.** After an edit, Home's list comes back with the product in its new place
  (ordered by expiration, `ProductList`), which snabbdom moves without a transition: a jump. Acceptable for now;
  a FLIP of the rows, measured in hooks as `gatherAndFly` measures, is in "Later".
- **The keyboard over the keypad.** While the name field is focused, the keyboard covers the keypad's panel and
  the button, as it covers the first step's buttons on the page that adds products; a tap on the date field
  (read-only, `inputMode: 'none'`) dismisses it. To be seen at 320×568 and on Android.

## Later, not in this change

- Deleting from the page (an overflow item in the app bar, with Home's snackbar on return).
- The scanner and the lookup on this page, to rename a product from its barcode.
- Editing the creation date ("bought on"), with the ring's meaning in mind: a third date entry, when moving the entry up
  as a program of `programs/` is weighed again.
- Repairing an `Invalid` row (a stored expiration before the creation date) from this page, which today can only
  be deleted: the page would start from an `UnvalidatedSnapshot` and a `fromSnapshot` that forgives the date.
- A transition for a row that moves in Home's list.
- A confirmation before discarding changes, should the owner want one.
