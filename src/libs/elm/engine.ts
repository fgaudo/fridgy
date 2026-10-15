import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as FiberMap from 'effect/FiberMap'
import * as FiberSet from 'effect/FiberSet'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'

export type Command<Message, R> = Effect.Effect<Message, never, R>

export type Step<State, Message, R> = Readonly<{
  state: State
  commands?: ReadonlyArray<Command<Message, R>>
}>

export type Update<State, Message, R> = (
  message: Message,
) => (state: State) => Step<State, Message, R>

export type Subscriptions<K, Message, R> = HashMap.HashMap<
  K,
  Stream.Stream<Message, never, R>
>

export type Emitter<State, Message, R, K = unknown> = (
  state: State,
) => Subscriptions<K, Message, R>

/**
 * A running Elm-style program.
 *
 * The engine owns its message loop: it is started by `make` and lives as long
 * as the scope it was created in. Consumers only observe states and dispatch
 * messages.
 */
export interface Engine<State, Message> {
  /** Emits the current state, then every following state. */
  readonly state$: Stream.Stream<State>
  /** Enqueues a message. Meant to be called from DOM event handlers. */
  readonly dispatch: (message: Message) => void
  /**
   * Never succeeds. Fails with the first defect raised by `update`, a command
   * or a subscription, so whoever runs the program can let it crash.
   */
  readonly await: Effect.Effect<never>
}

/** Restarts a subscription that died, after emitting a message for the defect. */
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
    Queue.unbounded<Message>(),
    Queue.shutdown,
  )
  // The loop and the commands. A defect in any of them fails `join`.
  const fibers = yield* FiberSet.make<unknown, never>()
  const subscriptionFibers = yield* FiberMap.make<K, void, never>()
  const stateRef = yield* SubscriptionRef.make(initState)

  const offer = (message: Message) => Queue.offer(queue, message)

  const runCommand = (command: Command<Message, R>) =>
    Opt.match(maybeMakeDefectMessage, {
      onNone: () => command,
      onSome: (f) => Effect.catchDefect(command, (defect) => Effect.succeed(f(defect))),
    }).pipe(
      Effect.flatMap(offer),
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
    message: Message,
  ) {
    const state = yield* SubscriptionRef.get(stateRef)
    const { state: newState, commands = [] } = update(message)(state)
    yield* SubscriptionRef.set(stateRef, newState)
    const nextActive = yield* reconcile(active, newState)
    yield* Effect.forEach(commands, runCommand, { discard: true })
    return nextActive
  })

  const initialActive = yield* reconcile(HashSet.empty(), initState)
  yield* Effect.forEach(initCommands, runCommand, { discard: true })

  yield* Effect.gen(function*() {
    let active = initialActive
    while (true) {
      const message = yield* Queue.take(queue)
      active = yield* step(active, message)
    }
  }).pipe(FiberSet.run(fibers))

  return {
    await: Effect.raceFirst(
      FiberSet.join(fibers),
      FiberMap.join(subscriptionFibers),
    ).pipe(Effect.andThen(Effect.never)),
    dispatch: (message) => {
      Queue.offerUnsafe(queue, message)
    },
    state$: SubscriptionRef.changes(stateRef),
  } satisfies Engine<State, Message>
})
