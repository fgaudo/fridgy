import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as FiberMap from 'effect/FiberMap'
import * as FiberSet from 'effect/FiberSet'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Queue from 'effect/Queue'
import type * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'

/** An effect that may produce a message: `None` for effects that only act on the outside world. */
export type Command<Message, R> = Effect.Effect<Opt.Option<Message>, never, R>

/**
 * The result of a transition. `events` are for the parent (the "OutMsg" pattern):
 * what happened that the program itself does not handle, e.g. a page asking to
 * be left. A program that emits none leaves `Event` as `never`.
 */
export type Step<State, Message, R, Event = never> = Readonly<{
  state: State
  commands?: ReadonlyArray<Command<Message, R>>
  events?: ReadonlyArray<Event>
}>

/**
 * What `update` returns for a message that makes no sense in the current state.
 *
 * The engine decides what a rejection means from where the message came from:
 * - from a frame whose own state rejects it too: the frame offered an action
 *   that `update` does not accept, i.e. the model and `update` disagree. It is a
 *   bug, however many messages arrived in between.
 * - from a frame whose state accepted it (a click on a frame that was already
 *   outdated, a double tap, …), or from a command or subscription: the message
 *   is stale and is ignored.
 */
export const reject: unique symbol = Symbol.for('@fgaudo/effect-tea/Rejected')
export type Rejected = typeof reject

export const isRejected = (result: unknown): result is Rejected => result === reject

export type Transition<State, Message, R, Event = never> = Step<State, Message, R, Event> | Rejected

export type Update<State, Message, R, Event = never> = (
  message: Message,
) => (state: State) => Transition<State, Message, R, Event>

/** Counts the states produced by the engine: every accepted message creates a new revision. */
export type Revision = number

export type Revisioned<State> = Readonly<{ state: State; revision: Revision }>

/** The defect raised when a frame dispatches a message that `update` rejects in the frame's own state. */
export class RejectedMessage extends Data.TaggedError('RejectedMessage')<{
  readonly message: unknown
  readonly revision: Revision
}> {}

// A view message carries the state its frame was drawn from, to tell a bug from a stale message.
type Origin<State> = Readonly<{ _tag: 'View'; frame: Revisioned<State> }> | Readonly<{ _tag: 'Program' }>

type Envelope<State, Message> = Readonly<{ message: Message; origin: Origin<State> }>

const fromProgram: Origin<never> = { _tag: 'Program' }

/**
 * Listens to the world while its key is in the subscriptions, sending what it hears with `emit`. It never
 * ends on its own, as its success type says: it stops when its key goes away.
 */
export type Subscription<Message, R> = (
  emit: (message: Message) => Effect.Effect<void>,
) => Effect.Effect<never, never, R>

export type Subscriptions<K, Message, R> = HashMap.HashMap<K, Subscription<Message, R>>

export type Emitter<State, Message, R, K = unknown> = (
  state: State,
) => Subscriptions<K, Message, R>

/** Where a defect happened: in `update`, in a command, or in the subscription with that key. */
export type DefectSource<K = unknown> =
  | Readonly<{ _tag: 'Update' }>
  | Readonly<{ _tag: 'Command' }>
  | Readonly<{ _tag: 'Subscription'; key: K }>

/**
 * A bug in the program:
 * - `Defect`: something blew up (an exception, an `Effect.die`). What it left behind is unknown, so the
 *   program always dies.
 * - `Rejected`: a frame sent a message that `update` rejects in the frame's own state (`revision`), so the
 *   model offered an action `update` does not accept. Nothing changed (`update` rejected it), so the
 *   program may go on (`RejectionOptions`).
 */
export type Bug<Message, K = unknown> =
  | Readonly<{ _tag: 'Defect'; cause: unknown; where: DefectSource<K> }>
  | Readonly<{ _tag: 'Rejected'; message: Message; revision: Revision }>

/** Reports a bug, e.g. to a crash-reporting service. */
export type BugReporter<Message, K = unknown> = (bug: Bug<Message, K>) => Effect.Effect<void>

/**
 * What a `Rejected` bug does. There is no default: whether a bug the user may never notice should crash
 * the app depends on where it runs.
 * - `'die'`: the program fails with `RejectedMessage`.
 * - `'ignore'`: the message is dropped and the program goes on, which is safe because the state did not
 *   change. `onBug` is then required: a bug that is neither fatal nor reported would go unnoticed.
 * `onBug` is called for every bug, defects included.
 */
export type RejectionOptions<Message, K = unknown> =
  | Readonly<{ onRejected: 'die'; onBug?: BugReporter<Message, K> }>
  | Readonly<{ onRejected: 'ignore'; onBug: BugReporter<Message, K> }>

export type RejectionPolicy = RejectionOptions<unknown>['onRejected']

/** By default a message is described by its `_tag` (or itself, if it is a string): logs never carry its data. */
export const describeByTag = (message: unknown): unknown =>
  typeof message === 'string'
    ? message
    : typeof message === 'object' && message !== null && '_tag' in message
    ? message._tag
    : typeof message

/** The engine owns its message loop: it runs as long as the scope `make` was called in. */
export interface Engine<State, Message> {
  readonly state$: Stream.Stream<Revisioned<State>>
  /**
   * Returns the dispatch for a view rendered from `frame`: the frame travels
   * with every message it enqueues, so that a rejected message can be told
   * apart as a bug or as stale.
   */
  readonly dispatchFrom: (frame: Revisioned<State>) => (message: Message) => void
  /**
   * Never succeeds. Fails with the first defect raised by `update`, a command
   * or a subscription, or with `RejectedMessage`, so whoever runs the program
   * can let it crash.
   */
  readonly await: Effect.Effect<never>
}

export const make = Effect.fn('Engine.make')(function*<State, Message, R, S, K>({
  init: { state: initState, commands: initCommands = [] },
  update,
  subscriptions,
  onBug = () => Effect.void,
  describeMessage = describeByTag,
  onRejected,
}:
  & {
    init: Step<State, Message, R>
    update: Update<State, Message, R>
    subscriptions: Emitter<State, Message, S, K>
    /** How a message appears in the logs, e.g. its tags only, without its data. */
    describeMessage?: (message: NoInfer<Message>) => unknown
  }
  & RejectionOptions<NoInfer<Message>, NoInfer<K>>)
{
  const context = yield* Effect.context<R | S>()
  const queue = yield* Effect.acquireRelease(
    Queue.unbounded<Envelope<State, Message>>(),
    Queue.shutdown,
  )
  // The loop and the commands. A defect in any of them fails `join`.
  const fibers = yield* FiberSet.make<unknown, never>()
  const subscriptionFibers = yield* FiberMap.make<K, void, never>()
  const stateRef = yield* SubscriptionRef.make<Revisioned<State>>({ state: initState, revision: 0 })
  const offer = (message: Message) => Queue.offer(queue, { message, origin: fromProgram })
  const reportDefect = (defect: unknown, where: DefectSource<K>) =>
    Effect.logError(`A defect in ${where._tag === 'Subscription' ? 'a subscription' : where._tag}`, where, defect).pipe(
      Effect.andThen(onBug({ _tag: 'Defect', cause: defect, where })),
    )
  const apply = (message: Message, state: State) =>
    Effect.sync(() => update(message)(state)).pipe(
      Effect.tapDefect((defect) => reportDefect(defect, { _tag: 'Update' })),
    )
  const runCommand = (command: Command<Message, R>) =>
    command.pipe(
      Effect.tapDefect((defect) => reportDefect(defect, { _tag: 'Command' })),
      Effect.flatMap(Opt.match({ onNone: () => Effect.void, onSome: offer })),
      Effect.provideContext(context),
      FiberSet.run(fibers),
    )
  /**
   * Starts the subscriptions whose key appeared and interrupts the ones whose
   * key disappeared. Subscriptions whose key is unchanged keep running.
   */
  const reconcile = Effect.fn(function*(
    active: HashSet.HashSet<K>,
    state: State,
  ) {
    const next = subscriptions(state)
    const nextKeys = HashSet.fromIterable(HashMap.keys(next))
    for (const key of HashSet.difference(active, nextKeys)) {
      yield* Effect.logDebug('Subscription stopped', key)
      yield* FiberMap.remove(subscriptionFibers, key)
    }
    for (const [key, subscription] of next) {
      if (HashSet.has(active, key)) {
        continue
      }
      yield* Effect.logDebug('Subscription started', key)
      yield* subscription((message) => Effect.asVoid(offer(message))).pipe(
        Effect.tapDefect((defect) => reportDefect(defect, { _tag: 'Subscription', key })),
        Effect.provideContext(context),
        FiberMap.run(subscriptionFibers, key),
      )
    }
    return nextKeys
  })
  const step = Effect.fn(function*(
    active: HashSet.HashSet<K>,
    { message, origin }: Envelope<State, Message>,
  ) {
    const { state, revision } = yield* SubscriptionRef.get(stateRef)
    const result = yield* apply(message, state)
    if (isRejected(result)) {
      if (origin._tag === 'View' && isRejected(yield* apply(message, origin.frame.state))) {
        const frameRevision = origin.frame.revision
        yield* Effect.logError(
          'A frame sent a message that update rejects in its own state: the model offered it, so the two disagree',
          describeMessage(message),
          { revision: frameRevision },
        )
        yield* onBug({ _tag: 'Rejected', message, revision: frameRevision })
        return onRejected === 'die'
          ? yield* Effect.die(new RejectedMessage({ message, revision: frameRevision }))
          : active
      }
      yield* Effect.logDebug('Ignored a stale message', describeMessage(message))
      return active
    }
    const { state: newState, commands = [] } = result
    // A message that changes nothing and does nothing (e.g. a scroll event that keeps the same state) is noise.
    if (newState !== state || commands.length > 0) {
      yield* Effect.logDebug('Message', describeMessage(message), { revision: revision + 1, commands: commands.length })
    }
    yield* SubscriptionRef.set(stateRef, { state: newState, revision: revision + 1 })
    const nextActive = yield* reconcile(active, newState)
    yield* Effect.forEach(commands, runCommand, { discard: true })
    return nextActive
  })
  const initialActive = yield* reconcile(HashSet.empty(), initState)
  yield* Effect.forEach(initCommands, runCommand, { discard: true })
  yield* Effect.gen(function*() {
    let active = initialActive
    while (true) {
      active = yield* step(active, yield* Queue.take(queue))
    }
  }).pipe(FiberSet.run(fibers))
  return {
    await: Effect.raceFirst(
      FiberSet.join(fibers),
      FiberMap.join(subscriptionFibers),
    ).pipe(Effect.andThen(Effect.never)),
    dispatchFrom: (frame) => (message) => {
      Queue.offerUnsafe(queue, { message, origin: { _tag: 'View', frame } })
    },
    state$: SubscriptionRef.changes(stateRef),
  } satisfies Engine<State, Message>
})
