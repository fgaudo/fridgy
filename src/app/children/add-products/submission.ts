// The product of `AddProducts`: what the two steps describe, the name alone (`Naming`) or with the date that the
// child `Expiration` holds (`Dating`), and its addition (`Submitting`), after which the next product starts at the
// name. A failure is told by the snackbar.
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type * as Expiration from '#app/programs/expiration/program.ts'
import * as Product from '#domain/product.ts'
import { ProductStore } from '#infrastructure/storage/products.ts'
import * as Day from '#libs/dates/day.ts'
import type { Command, Event, Failure, Outputs, State, Step, Tell, Transition } from './program.ts'

export type Message = Data.TaggedEnum<{
  // From the view.
  /** The first step's "Set expiration": goes on to the second step. */
  DateRequested: object
  /** The second step's back arrow: back to the name, the date forgotten. */
  DateDismissed: object
  /** Adds the product the step describes. */
  Started: object
  // From commands.
  Completed: { succeeded: boolean }
}>

const Message = Data.taggedEnum<Message>()

const Command = Data.taggedEnum<Command>()

export const back: Message = Message.DateDismissed()

/** Whether the second step is shown: while it takes the date, and while a product is added from it. */
export const showsDate = (state: State) =>
  state.phase._tag === 'Dating' || (state.phase._tag === 'Submitting' && state.phase.from === 'Dating')

// A product to be: the date has no stored one to start from.
export const newDate: Expiration.Flags = { maybeStored: Opt.none() }

/** A snackbar telling of a failure: it takes the place of the one standing. */
const telling = (failure: Failure): Tell => ({
  _tag: 'Snackbar',
  message: { _tag: 'Told', notice: failure, lasting: 'Short' },
})

const productOf = (state: State, maybeExpirationDate: Opt.Option<Day.Day>) =>
  Opt.flatMap(
    Opt.all([state.maybeName, state.maybeNow]),
    ([name, creationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
  )

/** The day the date concludes, when it names one: digits that name none, or no digits, add nothing. */
const dayOf = (maybeConcluded: Opt.Option<Expiration.Output>): Opt.Option<Day.Day> =>
  Opt.flatMap(maybeConcluded, (concluded) => concluded._tag === 'On' ? Opt.some(concluded.day) : Opt.none())

/**
 * The product a step describes: never expiring from the first, expiring on the day the date concludes from the
 * second. `update` and `makeModel` both ask this.
 */
const productOfStep = (state: State, step: Step, maybeConcluded: Opt.Option<Expiration.Output>) =>
  step === 'Naming'
    ? productOf(state, Opt.none())
    : Opt.flatMap(dayOf(maybeConcluded), (day) => productOf(state, Opt.some(day)))

export const add = Effect.fn('AddProduct')(
  function*({ product }: Readonly<{ product: Product.Product }>) {
    const { insertAll } = yield* ProductStore
    yield* Effect.logDebug('Adding a product', product.name)
    const ids = yield* insertAll([Product.toSnapshot(product)]).pipe(
      Effect.tapError((error) => Effect.logWarning('Could not add the product', error)),
    )
    yield* Effect.logInfo('Added a product', { ids })
  },
  Effect.match({
    onSuccess: () => Message.Completed({ succeeded: true }),
    onFailure: () => Message.Completed({ succeeded: false }),
  }),
  Effect.asSome,
  Effect.withLogSpan('AddProduct'),
)

export const update = Match.typeTags<Message, (state: State, children: Outputs) => Transition>()({
  // The date is the product's: only a name that is one goes on to it.
  DateRequested: () => (state) =>
    state.phase._tag === 'Naming' && Opt.isSome(productOf(state, Opt.none()))
      ? { state: { ...state, phase: { _tag: 'Dating' } } }
      : Tea.reject,

  DateDismissed: () => (state) =>
    state.phase._tag === 'Dating' ? { state: { ...state, phase: { _tag: 'Naming' } } } : Tea.reject,

  Started: () => (state, children) => {
    if (state.phase._tag !== 'Naming' && state.phase._tag !== 'Dating') return Tea.reject
    const from = state.phase._tag
    return Opt.match(productOfStep(state, from, children.Expiration.output()), {
      onNone: (): Transition => Tea.reject,
      onSome: (product): Transition => ({
        state: { ...state, phase: { _tag: 'Submitting', product, from } },
        commands: [Command.Add({ product })],
      }),
    })
  },

  // The next product starts at the name, kept: a second package may be next. The field is not drawn anew. It has
  // kept the focus, and a new one would close the keyboard and open it again. The product enters the fridge, due
  // by the day of the clock.
  Completed: ({ succeeded }) => (state) => {
    if (state.phase._tag !== 'Submitting') {
      return Tea.defect('Completed while no product is being added: only a completion leaves Submitting')
    }
    const { product, from } = state.phase
    if (!succeeded) {
      return {
        state: { ...state, phase: { _tag: from } },
        commands: [Command.Vibrate({ feedback: 'Reject' })],
        tell: [telling('AddFailed')],
      }
    }
    return Opt.match(state.maybeNow, {
      onNone: () => Tea.defect('Completed before the clock has ticked: a product is made only once it has'),
      onSome: (now): Transition => ({
        state: { ...state, phase: { _tag: 'Naming' } },
        commands: [Command.Vibrate({ feedback: 'Confirm' })],
        tell: [{ _tag: 'Fridge', message: { _tag: 'Admitted', product, today: Day.fromDateTime(now) } }],
      }),
    })
  },
})

/** The date's event. The order picked stays in use for this date either way: only the failure to keep it is told. */
export const orderNotKept = (state: State): Tea.Step<State, Command, Event, Tell> => ({
  state,
  commands: [Command.Vibrate({ feedback: 'Reject' })],
  tell: [telling('OrderNotKept')],
})

/** Goes on to the date, once the name is a product's. */
export const maybeRequestDateOf = (state: State): Opt.Option<Message> =>
  Opt.map(productOf(state, Opt.none()), () => Message.DateRequested())

/** Adds the product, once the step describes one. */
export const maybeAddOf = (
  state: State,
  step: Step,
  maybeConcluded: Opt.Option<Expiration.Output>,
): Opt.Option<Message> => Opt.map(productOfStep(state, step, maybeConcluded), () => Message.Started())
