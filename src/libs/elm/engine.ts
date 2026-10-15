import * as Cause from 'effect/Cause'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as FiberMap from 'effect/FiberMap'
import * as FiberSet from 'effect/FiberSet'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'

/** An effect that may produce a message: `None` for effects that only act on the outside world. */
export type Command<Message, R> = Effect.Effect<Opt.Option<Message>, never, R>

export type Step<State, Message, R> = Readonly<{
  state: State
  commands?: ReadonlyArray<Command<Message, R>>
}>

/**
 * What `update` returns for a message that makes no sense in the current state.
 *
 * The engine decides what a rejection means from where the message came from:
 * - from the view rendered for the *current* state: the view offered an action
 *   that `update` does not accept, i.e. the model and `update` disagree. It is a
 *   bug, and the engine dies with `RejectedMessage`.
 * - from the view rendered for an *older* state (a click on a frame that was
 *   already outdated, a double tap, …), or from a command or subscription: the
 *   message is stale and is ignored.
 */
export const reject: unique symbol = Symbol.for('@fgaudo/elm/Rejected')
export type Rejected = typeof reject

export const isRejected = (result: unknown): result is Rejected => result === reject

export type Transition<State, Message, R> = Step<State, Message, R> | Rejected

export type Update<State, Message, R> = (
  message: Message,
) => (state: State) => Transition<State, Message, R>

/** Counts the states produced by the engine: every accepted message creates a new revision. */
export type Revision = number

export type Revisioned<State> = Readonly<{ state: State; revision: Revision }>

/** The defect raised when the current view dispatches a message that `update` rejects. */
export class RejectedMessage extends Data.TaggedError('RejectedMessage')<{
  readonly message: unknown
  readonly revision: Revision
}> {}

type Origin = Readonly<{ _tag: 'View'; revision: Revision }> | Readonly<{ _tag: 'Program' }>

type Envelope<Message> = Readonly<{ message: Message; origin: Origin }>

const fromProgram: Origin = { _tag: 'Program' }

export type Subscriptions<K, Message, R> = HashMap.HashMap<
  K,
  Stream.Stream<Message, never, R>
>

export type Emitter<State, Message, R, K = unknown> = (
  state: State,
) => Subscriptions<K, Message, R>

/** The engine owns its message loop: it runs as long as the scope `make` was called in. */
export interface Engine<State, Message> {
  readonly state$: Stream.Stream<Revisioned<State>>
  /**
   * Returns the dispatch for a view rendered from the state with the given
   * revision: the revision travels with every message it enqueues, so that a
   * rejected message can be told apart as a bug or as stale.
   */
  readonly dispatchFrom: (revision: Revision) => (message: Message) => void
  /**
   * Never succeeds. Fails with the first defect raised by `update`, a command
   * or a subscription, or with `RejectedMessage`, so whoever runs the program
   * can let it crash.
   */
  readonly await: Effect.Effect<never>
}

const makeResilient = <Message, R>(
  stream$: Stream.Stream<Message, never, R>,
  makeDefectMessage: (cause: unknown) => Message,
) => {
  const resilient$: Stream.Stream<Message, never, R> = Stream.suspend(() =>
    stream$.pipe(
      Stream.catchCauseIf(
        (cause) => !Cause.hasInterrupts(cause),
        (cause) =>
          Stream.concat(
            Stream.make(makeDefectMessage(cause)),
            Stream.unwrap(
              Effect.as(Effect.sleep('1 second'), resilient$),
            ),
          ),
      ),
    )
  )
  return resilient$
}

export const make = Effect.fn('Engine.make')(function*<State, Message, R, S, K>({
  init: { state: initState, commands: initCommands = [] },
  update,
  subscriptions,
  makeDefectMessage,
}: {
  init: Step<State, Message, R>
  update: Update<State, Message, R>
  subscriptions: Emitter<State, Message, S, K>
  /**
   * Opt-in recovery: when given, a defect in a command or a subscription
   * becomes a message (and the subscription is restarted) instead of failing
   * the engine. Defects in `update` always fail the engine.
   */
  makeDefectMessage?: (cause: unknown) => NoInfer<Message>
}) {
  const maybeMakeDefectMessage = Opt.fromUndefinedOr(makeDefectMessage)
  const context = yield* Effect.context<R | S>()
  const queue = yield* Effect.acquireRelease(
    Queue.unbounded<Envelope<Message>>(),
    Queue.shutdown,
  )
  // The loop and the commands. A defect in any of them fails `join`.
  const fibers = yield* FiberSet.make<unknown, never>()
  const subscriptionFibers = yield* FiberMap.make<K, void, never>()
  const stateRef = yield* SubscriptionRef.make<Revisioned<State>>({ state: initState, revision: 0 })

  const offer = (message: Message) => Queue.offer(queue, { message, origin: fromProgram })

  const runCommand = (command: Command<Message, R>) =>
    Opt.match(maybeMakeDefectMessage, {
      onNone: () => command,
      onSome: (f) => Effect.catchDefect(command, (defect) => Effect.succeedSome(f(defect))),
    }).pipe(
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
      yield* FiberMap.remove(subscriptionFibers, key)
    }
    for (const [key, stream$] of next) {
      if (HashSet.has(active, key)) {
        continue
      }
      yield* Opt.match(maybeMakeDefectMessage, {
        onNone: () => stream$,
        onSome: (f) => makeResilient(stream$, f),
      }).pipe(
        Stream.runForEach(offer),
        Effect.provideContext(context),
        FiberMap.run(subscriptionFibers, key),
      )
    }
    return nextKeys
  })

  const step = Effect.fn(function*(
    active: HashSet.HashSet<K>,
    { message, origin }: Envelope<Message>,
  ) {
    const { state, revision } = yield* SubscriptionRef.get(stateRef)
    const result = update(message)(state)
    if (isRejected(result)) {
      if (origin._tag === 'View' && origin.revision === revision) {
        return yield* Effect.die(new RejectedMessage({ message, revision }))
      }
      yield* Effect.logDebug('Ignored a stale message', message)
      return active
    }
    const { state: newState, commands = [] } = result
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
    dispatchFrom: (revision) => (message) => {
      Queue.offerUnsafe(queue, { message, origin: { _tag: 'View', revision } })
    },
    state$: SubscriptionRef.changes(stateRef),
  } satisfies Engine<State, Message>
})
