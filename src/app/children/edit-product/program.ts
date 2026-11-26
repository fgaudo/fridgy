// The page that edits a stored product: its name, and its expiration date, a child typed on a keypad
// (`docs/edit-product.md`). Its form waits for the clock (`Loading`), takes input (`Editing`), is written (`Saving`)
// or stands for a product no longer stored (`Gone`). Once the product is saved, the page asks to be left. A failure
// is told by its snackbar, a child that leaves on its own.
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Expiration from '#app/programs/expiration/program.ts'
import * as SnackbarProgram from '#app/programs/snackbar/program.ts'
import * as Product from '#domain/product.ts'
import { type BackButton, pressesAs } from '#infrastructure/back-button/back-button.ts'
import { type Feedback, vibrate } from '#infrastructure/haptics/haptics.ts'
import { insetsAs, type Keyboard } from '#infrastructure/keyboard/keyboard.ts'
import { ProductStore } from '#infrastructure/storage/products.ts'
import type * as Day from '#libs/dates/day.ts'
import { every } from '#libs/timers/timers.ts'

/** What the page starts from: the product as the row the user tapped shows it, and its id in the storage. */
export type Flags = Readonly<{ id: Product.ProductId; product: Product.Product }>

/** What the fields hold once the time is known: a save that fails gives them back. */
export type Fields = Readonly<{
  /** The current time, in the device's zone: the product is edited in its zone. */
  now: DateTime.Zoned
  /** The name as typed; whether it is a name is decided when saving. */
  name: string
  /** How many times the name's field was drawn anew: with each clearing. */
  replacements: number
}>

export type Form = Data.TaggedEnum<{
  /** Until the clock has told the time: the date offers no day without today, and a product is edited in a zone. */
  Loading: object
  Editing: Readonly<{ fields: Fields }>
  /** The product is being saved: only its completion leaves this state. */
  Saving: Readonly<{ fields: Fields; product: Product.Product }>
  /**
   * Nothing is stored under the id any more: the fields stay, taking no input, while its snackbar says so. Its end
   * asks to be left.
   */
  Gone: Readonly<{ fields: Fields }>
}>

const Form = Data.taggedEnum<Form>()

export type State = Readonly<{
  id: Product.ProductId
  /** The product as it was opened: what the fields started from, and what "changed" is measured against. */
  original: Product.Product
  /** How far the keyboard covers the page's bottom, in dp, navigation bar included: the window is never resized. */
  keyboardInset: number
  form: Form
}>

/** What the write answered: done, failed, or nothing is stored under the id any more. */
export type Outcome = Data.TaggedEnum<{
  Saved: object
  Failed: object
  Gone: object
}>

/** What failed: the snackbar says so. */
export type Failure = 'SaveFailed' | 'OrderNotKept' | 'ProductGone'

type Own = Data.TaggedEnum<{
  // From the view.
  /** The name's field, with the text it holds. */
  NameTyped: { value: string }
  /** The name field's clear button: empties the name. */
  NameCleared: object
  /** Saves the product the fields describe. */
  SaveStarted: object
  /** The app bar's close button. */
  Closed: object
  // From subscriptions.
  TimeChanged: { now: DateTime.Zoned }
  /** The platform's back button. */
  BackPressed: object
  /** The keyboard has come up, changed height or gone down. */
  KeyboardMoved: { inset: number }
  // From commands.
  Saved: { outcome: Outcome }
}>

const Own = Data.taggedEnum<Own>()

export type Command = Data.TaggedEnum<{
  /** Writes a product that `update` has already validated, under its id. */
  Save: { id: Product.ProductId; product: Product.Product }
  Vibrate: { feedback: Feedback }
}>

const Command = Data.taggedEnum<Command>()

export type Event = Data.TaggedEnum<{
  LeaveRequested: object
}>

const Event = Data.taggedEnum<Event>()

export type Key = 'clock' | 'back-button' | 'keyboard'

const Snackbar = SnackbarProgram.make<Failure>()

/** What every state draws: how far the page keeps clear of the keyboard, which covers whatever is under it. */
type PageShown = Readonly<{ keyboardInset: number }>

/** What is drawn in every state but `Loading`: the fields, and the snackbar over them. */
export type FieldsShown = Readonly<{
  name: string
  /** Changes when the name is cleared, not by typing. */
  nameKey: number
  /** The date's segments, field, strip and keypad. */
  expiration: Expiration.Model
  /** Whether saving leaves the product without an expiration: the date concludes on none. */
  withoutDate: boolean
  /** Over the fields. */
  snackbar: SnackbarProgram.Model<Failure>
}>

export type Model = Data.TaggedEnum<{
  /** The app bar alone, until the fields can be drawn: the stored date needs the order to be shown as digits. */
  Loading: PageShown & Readonly<{ close: Own }>
  Editing:
    & PageShown
    & FieldsShown
    & Readonly<{
      close: Own
      /** The name's field, filled with the text it holds. */
      nameTyped: Readonly<{ _tag: 'NameTyped' }>
      /** Empties the name, while there is one. */
      maybeClearName: Opt.Option<Own>
      /** Saves, once the fields describe a product other than the stored one. */
      maybeSave: Opt.Option<Own>
    }>
  /** The product is being saved: the fields, their controls disabled. */
  Saving: PageShown & FieldsShown
  /** The product is no longer stored: the fields, their controls disabled, and the app bar's close button. */
  Gone: PageShown & FieldsShown & Readonly<{ close: Own }>
}>

const Model = Data.taggedEnum<Model>()

type Told = Readonly<{ _tag: 'Snackbar'; message: SnackbarProgram.External<Failure> }>

type Step = Tea.Step<State, Command, Event, Told>

type Transition = Tea.Transition<State, Command, Event, Told>

/** A failure told: its snackbar, which takes the place of the one standing, and a vibration. */
const telling = (failure: Failure) => (state: State): Step => ({
  state,
  commands: [Command.Vibrate({ feedback: 'Reject' })],
  tell: [{ _tag: 'Snackbar', message: { _tag: 'Told', notice: failure, lasting: 'Short' } }],
})

/** The form with its fields changed, in the case it is in. */
const withFields = (
  form: Form & { _tag: 'Editing' | 'Saving' | 'Gone' },
  change: (fields: Fields) => Fields,
): Form => ({
  ...form,
  fields: change(form.fields),
})

/** The expiration the date concludes on: `None` while its digits name no day. */
const maybeExpirationOf = (output: Expiration.Output): Opt.Option<Opt.Option<Day.Day>> =>
  Match.valueTags(output, {
    Undecided: () => Opt.none(),
    Never: () => Opt.some(Opt.none()),
    On: ({ day }) => Opt.some(Opt.some(day)),
  })

const isSameExpiration = Opt.makeEquivalence((a: Day.Day, b: Day.Day) => a === b)

/**
 * The product "Save" writes: the one made from the name and what the date concludes, when it is one and differs
 * from the stored one. The made product is compared, not the typed text: a name retyped with other spacing is no
 * change.
 */
const maybeSaved = (
  state: State,
  fields: Fields,
  maybeOutput: Opt.Option<Expiration.Output>,
): Opt.Option<Product.Product> =>
  Opt.flatMap(Opt.flatMap(maybeOutput, maybeExpirationOf), (maybeExpirationDate) =>
    Opt.filter(
      Product.edit(state.original, { name: fields.name, maybeExpirationDate }, fields.now.zone),
      (product) =>
        product.name !== state.original.name
        || !isSameExpiration(product.maybeExpirationDate, state.original.maybeExpirationDate),
    ))

// Only today and the zone are needed: a date typed without a year is read from today, and a product is edited in
// the zone. The product's own dates never come from the clock.
const clock = every('30 seconds', (now) => Own.TimeChanged({ now }))

// Observed as long as the page is there: while the product is being saved, the press is heard and held, so that the
// platform does not leave the app.
const backButton: Tea.Subscription<Own, BackButton> = pressesAs(Own.BackPressed())

// Observed as long as the page is there: the keyboard covers the fields and the button docked under them.
const keyboard: Tea.Subscription<Own, Keyboard> = insetsAs((inset) => Own.KeyboardMoved({ inset }))

const keys: ReadonlyArray<Key> = ['clock', 'back-button', 'keyboard']

const save = Effect.fn('SaveProduct')(
  function*({ id, product }: Readonly<{ id: Product.ProductId; product: Product.Product }>) {
    const { update } = yield* ProductStore
    yield* Effect.logDebug('Saving a product', { id })
    yield* update(id, Product.toSnapshot(product)).pipe(
      Effect.tapError((error) => Effect.logWarning('Could not save the product', error)),
    )
    yield* Effect.logInfo('Saved a product', { id })
    return Own.Saved({ outcome: { _tag: 'Saved' } })
  },
  Effect.catch((error) =>
    error._tag === 'ProductNotStored'
      ? Effect.succeed(Own.Saved({ outcome: { _tag: 'Gone' } }))
      : Effect.succeed(Own.Saved({ outcome: { _tag: 'Failed' } }))
  ),
  Effect.asSome,
  Effect.withLogSpan('SaveProduct'),
)

const { child, withChildren } = Tea.program<{
  state: State
  model: Model
  message: Own
  command: Command
  event: Event
  flags: Flags
  key: Key
}>()

export const program = withChildren({
  // There from the clock's first tick: the stored date is edited in the zone, and its days are offered from today.
  // It takes no key while the product is saved, nor once it is gone.
  Expiration: child(Expiration.program, {
    flags: (state) => state.form._tag === 'Loading' ? Opt.none() : Opt.some({ maybeStored: Opt.some(state.original) }),
    tell: (state) => ({
      _tag: 'PageChanged',
      maybeNow: state.form._tag === 'Loading' ? Opt.none() : Opt.some(state.form.fields.now),
      isLocked: state.form._tag === 'Saving' || state.form._tag === 'Gone',
    }),
  }),
  Snackbar: child(Snackbar),
}).make({
  init: ({ id, product }) => ({ state: { id, original: product, keyboardInset: 0, form: Form.Loading() } }),

  update: (message, children) => (state) =>
    Match.valueTags(message, {
      // Kept while saving too, the field drawn read-only: a key typed just before the save may come after it, and
      // the field, which holds its own text, shows it. A save that fails gives the name back as the field shows it.
      // A product that is gone has nothing to save to.
      NameTyped: ({ value }): Transition =>
        state.form._tag === 'Editing' || state.form._tag === 'Saving'
          ? { state: { ...state, form: withFields(state.form, (fields) => ({ ...fields, name: value })) } }
          : Tea.reject,

      // The field is drawn anew, empty: the user owns its text until the program replaces it.
      NameCleared: (): Transition =>
        state.form._tag === 'Editing' && state.form.fields.name !== ''
          ? {
            state: {
              ...state,
              form: withFields(
                state.form,
                (fields) => ({ ...fields, name: '', replacements: fields.replacements + 1 }),
              ),
            },
          }
          : Tea.reject,

      SaveStarted: (): Transition => {
        if (state.form._tag !== 'Editing') {
          return Tea.reject
        }
        const { fields } = state.form
        return Opt.match(maybeSaved(state, fields, children.Expiration.output()), {
          onNone: (): Transition => Tea.reject,
          onSome: (product) => ({
            state: { ...state, form: Form.Saving({ fields, product }) },
            commands: [Command.Save({ id: state.id, product })],
          }),
        })
      },

      // Each press asks the parent to leave, which removes the page on the first one. The changes are discarded.
      Closed: (): Transition => state.form._tag === 'Saving' ? Tea.reject : { state, events: [Event.LeaveRequested()] },

      TimeChanged: ({ now }): Step =>
        state.form._tag === 'Loading'
          ? { state: { ...state, form: Form.Editing({ fields: { now, name: state.original.name, replacements: 0 } }) } }
          : { state: { ...state, form: withFields(state.form, (fields) => ({ ...fields, now })) } },

      KeyboardMoved: ({ inset }): Step => ({ state: { ...state, keyboardInset: inset } }),

      // The page is not left in the middle of a write: the press is held, so that the platform does not leave the app.
      BackPressed: (): Step => state.form._tag === 'Saving' ? { state } : { state, events: [Event.LeaveRequested()] },

      // Once saved, the page asks to be left: Home's list shows the change. Once there is nothing to save to, the
      // page says so, and is left when its snackbar is.
      Saved: ({ outcome }): Step => {
        if (state.form._tag !== 'Saving') {
          return Tea.defect('Saved while no product is being saved: only a completion leaves Saving')
        }
        const { fields } = state.form
        return Match.valueTags(outcome, {
          Saved: (): Step => ({
            state: { ...state, form: Form.Editing({ fields }) },
            commands: [Command.Vibrate({ feedback: 'Confirm' })],
            events: [Event.LeaveRequested()],
          }),
          Failed: () => telling('SaveFailed')({ ...state, form: Form.Editing({ fields }) }),
          Gone: () => telling('ProductGone')({ ...state, form: Form.Gone({ fields }) }),
        })
      },
    }),

  onEvent: {
    // The order picked stays in use for this date either way: only the failure to keep it is told, unless the
    // product is gone, whose snackbar stands until the page goes.
    Expiration: () => (state) => state.form._tag === 'Gone' ? { state } : telling('OrderNotKept')(state),
    // A product that is gone has been told: the page asks to be left. Any other snackbar just leaves.
    Snackbar: () => (state) => state.form._tag === 'Gone' ? { state, events: [Event.LeaveRequested()] } : { state },
  },

  runCommand: Match.typeTags<Command>()({
    Save: save,
    Vibrate: vibrate,
  }),

  // The back button is observed in every state: while saving, so that a press is held.
  subscriptions: () => keys,

  listen: Match.type<Key>().pipe(
    Match.when('clock', () => clock),
    Match.when('back-button', () => backButton),
    Match.when('keyboard', () => keyboard),
    Match.exhaustive,
  ),

  makeModel: (state, children) => {
    const { keyboardInset } = state
    const maybeExpiration = Opt.filter(children.Expiration(), ({ order }) => order._tag === 'Known')
    if (state.form._tag === 'Loading' || Opt.isNone(maybeExpiration)) {
      return Model.Loading({ keyboardInset, close: Own.Closed() })
    }
    const maybeOutput = children.Expiration.output()
    const { fields } = state.form
    const shown = {
      keyboardInset,
      name: fields.name,
      nameKey: fields.replacements,
      expiration: maybeExpiration.value,
      withoutDate: Opt.exists(maybeOutput, ({ _tag }) => _tag === 'Never'),
      snackbar: children.Snackbar(),
    }
    return Match.valueTags(state.form, {
      Editing: () =>
        Model.Editing({
          ...shown,
          close: Own.Closed(),
          nameTyped: { _tag: 'NameTyped' },
          maybeClearName: fields.name !== '' ? Opt.some(Own.NameCleared()) : Opt.none(),
          maybeSave: Opt.map(maybeSaved(state, fields, maybeOutput), () => Own.SaveStarted()),
        }),
      Saving: () => Model.Saving(shown),
      Gone: () => Model.Gone({ ...shown, close: Own.Closed() }),
    })
  },
})

export type Message = Tea.MessageOf<typeof program>
