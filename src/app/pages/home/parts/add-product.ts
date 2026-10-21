// The form that adds a product. Submitting is a state that only its completion
// leaves; what is typed is stored in every state where the form is open.
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Product from '#app/domain/product.ts'
import * as ProductCommands from '#app/ports/product-commands.ts'
import * as NormalizedString from '#libs/strings/normalized-string.ts'

type Form = Readonly<{
  maybeName: Opt.Option<string>
  maybeExpirationDate: Opt.Option<DateTime.Utc>
}>

export type State = Data.TaggedEnum<{
  Closed: object
  Editing: Form
  Submitting: Form
}>

export type ExternalMessage = Data.TaggedEnum<{
  /** Android's back button: closes the form if it can. */
  BackPressed: object
}>

export const ExternalMessage = Data.taggedEnum<ExternalMessage>()

export type Message =
  | ExternalMessage
  | Data.TaggedEnum<{
    // From the view.
    Opened: object
    Closed: object
    NameChanged: { name: string }
    ExpirationDateChanged: { expiration: string | number }
    Started: object
    // From commands.
    Completed: { succeeded: boolean }
  }>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{ Add: Form }>

const Command = Data.taggedEnum<Command>()

export type Event = Data.TaggedEnum<{
  Failed: object
  /** The form is closed: the back button is for someone else. */
  NothingToClose: object
}>

const Event = Data.taggedEnum<Event>()

type Fields = Readonly<{
  name: string
  /** In the format of `<input type="date">`. */
  expirationDate: string
}>

type Editable =
  & Fields
  & Readonly<{
    close: Tea.Offered<Message>
    changeName: (name: string) => Tea.Offered<Message>
    changeExpiration: (expiration: string) => Tea.Offered<Message>
  }>

export type Model = Data.TaggedEnum<{
  Closed: { open: Tea.Offered<Message> }
  /** The name is blank: there is nothing to add yet. */
  Incomplete: Editable
  Complete: Editable & Readonly<{ submit: Tea.Offered<Message> }>
  /** The inputs are disabled until the submission completes. */
  Submitting: Fields
}>

type Open = Exclude<State, { readonly _tag: 'Closed' }>

const isOpen = (state: State): state is Open => state._tag !== 'Closed'

const hasValidName = (form: Form) => Opt.exists(form.maybeName, (name) => Opt.isSome(NormalizedString.fromString(name)))

const add = ({ maybeName, maybeExpirationDate }: Form) =>
  Tea.attempt(
    Effect.gen(function*() {
      const { add } = yield* ProductCommands.ProductCommands
      const current = yield* DateTime.now
      const form = { maybeCreationDate: Opt.some(current), maybeName, maybeExpirationDate }
      const product = yield* Product.fromSnapshot(form).pipe(
        Effect.fromOption,
        Effect.tapError(() => Effect.logWarning('The product is not valid: it was not added', form)),
      )
      yield* Effect.logDebug('Adding a product', Product.name(product))
      const id = yield* pipe(
        ProductCommands.AddProduct({ snapshot: Product.toSnapshot(product) }),
        Effect.request(add),
        // The storage logs the cause.
        Effect.tapError(() => Effect.logWarning('Could not add the product')),
      )
      yield* Effect.logInfo('Added a product', { id })
    }),
    {
      onSuccess: () => Message.Completed({ succeeded: true }),
      onFailure: () => Message.Completed({ succeeded: false }),
    },
  ).pipe(Effect.withLogSpan('AddProduct'))

export const program: Tea.Program<State, Model, Message, Command, ProductCommands.ProductCommands, Event> = {
  init: { state: { _tag: 'Closed' } },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    Opened: () => (state) =>
      state._tag === 'Closed'
        ? { state: { _tag: 'Editing', maybeName: Opt.none(), maybeExpirationDate: Opt.none() } }
        : Tea.reject,

    // The form stays open until the submission completes.
    Closed: () => (state) => state._tag === 'Editing' ? { state: { _tag: 'Closed' } } : Tea.reject,

    // Accepted while submitting too, though the inputs are disabled then: a key
    // typed just before is kept, for when the submission fails.
    NameChanged: ({ name }) => (state) =>
      // The raw text is kept as typed; whether it is a valid name is decided when adding.
      isOpen(state) ? { state: { ...state, maybeName: Opt.some(name) } } : Tea.reject,

    ExpirationDateChanged: ({ expiration }) => (state) =>
      isOpen(state) ? { state: { ...state, maybeExpirationDate: DateTime.make(expiration) } } : Tea.reject,

    Started: () => (state) => {
      if (state._tag !== 'Editing' || !hasValidName(state)) {
        return Tea.reject
      }
      const { maybeName, maybeExpirationDate } = state
      return {
        state: { _tag: 'Submitting', maybeName, maybeExpirationDate },
        commands: [Command.Add({ maybeName, maybeExpirationDate })],
      }
    },

    Completed: ({ succeeded }) => (state) => {
      if (state._tag !== 'Submitting') {
        return Tea.reject
      }
      const { maybeName, maybeExpirationDate } = state
      return succeeded
        ? { state: { _tag: 'Closed' } }
        : { state: { _tag: 'Editing', maybeName, maybeExpirationDate }, events: [Event.Failed()] }
    },

    BackPressed: () => (state) => {
      switch (state._tag) {
        case 'Editing':
          return { state: { _tag: 'Closed' } }
        // The form cannot be closed while it is being submitted.
        case 'Submitting':
          return { state }
        case 'Closed':
          return { state, events: [Event.NothingToClose()] }
      }
    },
  }),

  runCommand: Match.typeTags<Command>()({
    Add: add,
  }),

  makeModel: (state, { offer, offerInput }) => {
    if (state._tag === 'Closed') {
      return { _tag: 'Closed', open: offer(Message.Opened()) }
    }
    const name = Opt.getOrElse(state.maybeName, () => '')
    const expirationDate = Opt.match(state.maybeExpirationDate, {
      onNone: () => '',
      onSome: DateTime.formatIsoDateUtc,
    })
    if (state._tag === 'Submitting') {
      return { _tag: 'Submitting', name, expirationDate }
    }
    const editable = {
      name,
      expirationDate,
      close: offer(Message.Closed()),
      changeName: offerInput((name) => Message.NameChanged({ name }), name),
      changeExpiration: offerInput((expiration) => Message.ExpirationDateChanged({ expiration }), expirationDate),
    }
    return hasValidName(state)
      ? { _tag: 'Complete', ...editable, submit: offer(Message.Started()) }
      : { _tag: 'Incomplete', ...editable }
  },
}
