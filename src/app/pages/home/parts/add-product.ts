// The form that adds a product. Submitting is a state that only its completion
// leaves; what is typed is stored in every state where the form is open.
import * as Tea from '@fgaudo/effect-tea'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Product from '#app/domain/product.ts'
import * as ProductCommands from '#app/ports/product-commands.ts'

type Form = Readonly<{
  maybeName: Opt.Option<string>
  maybeExpirationDate: Opt.Option<DateTime.Utc>
  /** The current time, once the clock has ticked: the product is created then. */
  maybeNow: Opt.Option<DateTime.Utc>
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
    // From subscriptions.
    TimeChanged: { now: DateTime.Utc }
    // From commands.
    Completed: { succeeded: boolean }
  }>

const Message = Data.taggedEnum<Message>()

/** Adds a product that `update` has already validated. */
export type Command = Data.TaggedEnum<{ Add: { product: Product.Product } }>

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
    close: Message
    changeName: (name: string) => Message
    changeExpiration: (expiration: string) => Message
  }>

export type Model = Data.TaggedEnum<{
  Closed: { open: Message }
  /** Not a product yet: the name is blank, or the product would expire before the day it is added. */
  Incomplete: Editable & Readonly<{ isExpirationPast: boolean }>
  Complete: Editable & Readonly<{ submit: Message }>
  /** The inputs are disabled until the submission completes. */
  Submitting: Fields
}>

type Open = Exclude<State, { readonly _tag: 'Closed' }>

const isOpen = (state: State): state is Open => state._tag !== 'Closed'

/** The product the form describes, created now, if it is one. */
const productOf = (form: Form) =>
  Opt.flatMap(
    Opt.all([form.maybeName, form.maybeNow]),
    ([name, creationDate]) => Product.make({ name, creationDate, maybeExpirationDate: form.maybeExpirationDate }),
  )

// Refreshed often, so that the creation date is close to when the user adds the product.
const clock = Channel.forever(
  Channel.fromEffect(DateTime.now).pipe(
    Channel.map((now) => Message.TimeChanged({ now })),
    Channel.concatWith(() => Channel.fromEffectDrain(Effect.sleep('1 second'))),
  ),
)

const add = Effect.fn('AddProduct')(
  function*({ product }: Readonly<{ product: Product.Product }>) {
    const { add } = yield* ProductCommands.ProductCommands
    yield* Effect.logDebug('Adding a product', product.name)
    const id = yield* pipe(
      ProductCommands.AddProduct({ snapshot: Product.toSnapshot(product) }),
      Effect.request(add),
      // The storage logs the cause.
      Effect.tapError(() => Effect.logWarning('Could not add the product')),
    )
    yield* Effect.logInfo('Added a product', { id })
  },
  Tea.attempt({
    onSuccess: () => Message.Completed({ succeeded: true }),
    onFailure: () => Message.Completed({ succeeded: false }),
  }),
  Effect.withLogSpan('AddProduct'),
)

export const program: Tea.Program<{
  state: State
  model: Model
  message: Message
  command: Command
  services: ProductCommands.ProductCommands
  event: Event
  external: ExternalMessage
}> = {
  init: { state: { _tag: 'Closed' } },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    Opened: () => (state) =>
      state._tag === 'Closed'
        ? {
          state: { _tag: 'Editing', maybeName: Opt.none(), maybeExpirationDate: Opt.none(), maybeNow: Opt.none() },
        }
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

    TimeChanged: ({ now }) => (state) => isOpen(state) ? { state: { ...state, maybeNow: Opt.some(now) } } : Tea.reject,

    Started: () => (state) => {
      if (state._tag !== 'Editing') {
        return Tea.reject
      }
      return Opt.match(productOf(state), {
        onNone: () => Tea.reject,
        onSome: (product) => ({ state: { ...state, _tag: 'Submitting' }, commands: [Command.Add({ product })] }),
      })
    },

    Completed: ({ succeeded }) => (state) => {
      if (state._tag !== 'Submitting') {
        return Tea.reject
      }
      return succeeded
        ? { state: { _tag: 'Closed' } }
        : { state: { ...state, _tag: 'Editing' }, events: [Event.Failed()] }
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

  subscriptions: (state) => isOpen(state) ? HashMap.make(['clock', clock]) : HashMap.empty(),

  makeModel: (state) => {
    if (state._tag === 'Closed') {
      return { _tag: 'Closed', open: Message.Opened() }
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
      close: Message.Closed(),
      changeName: (name: string) => Message.NameChanged({ name }),
      changeExpiration: (expiration: string) => Message.ExpirationDateChanged({ expiration }),
    }
    const isExpirationPast = Opt.exists(
      Opt.all([state.maybeNow, state.maybeExpirationDate]),
      ([now, expiration]) => !Product.canExpireOn(now)(expiration),
    )
    return Opt.isSome(productOf(state))
      ? { _tag: 'Complete', ...editable, submit: Message.Started() }
      : { _tag: 'Incomplete', ...editable, isExpirationPast }
  },
}
