import * as Array from 'effect/Array'
import * as Cause from 'effect/Cause'
import * as Context from 'effect/Context'
import type * as Data from 'effect/Data'
import * as Deferred from 'effect/Deferred'
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Function from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Layer from 'effect/Layer'
import * as Newtype from 'effect/Newtype'
import * as Option from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Ref from 'effect/Ref'
import * as Stream from 'effect/Stream'

export type Command<Message, R> = Effect.Effect<
  Message,
  never,
  R
>

export type Step<State, Message, R> = readonly [
  State,
  ReadonlyArray<Command<Message, R>>,
]

export type Update<State, Message, R> = (
  message: Message,
) => (state: State) => readonly [
  State,
  ReadonlyArray<Command<Message, R>>,
]

export type Emitter<State, Message, R, K = unknown> = (
  s: State,
) => HashMap.HashMap<
  K,
  Stream.Stream<Message, never, R>
>

export type Engine<State, Message> = Newtype.Newtype<
  '#fgaudo/fsm/Engine',
  {
    messageQueue: Queue.Queue<Message>
    message$: Stream.Stream<Message>
    state$: Stream.Stream<State>
    hasStartedRef: Ref.Ref<boolean>
  }
>

const makeResilient = <Message, R>(
  stream$: Stream.Stream<Message, never, R>,
  makeDefectMessage: (err: unknown) => Message,
) => {
  const s: Stream.Stream<
    Message,
    never,
    R
  > = Stream.suspend(() =>
    stream$.pipe(
      Stream.catchCauseIf(
        (cause) => !Cause.hasInterrupts(cause),
        (cause) =>
          Stream.concat(
            Stream.make(makeDefectMessage(cause)),
            Stream.unwrap(
              Effect.gen(function*() {
                yield* Effect.sleep('1 second')
                return s
              }),
            ),
          ),
      ),
    )
  )

  return s
}

const modifySubs = <Message>(
  makeDefectMessage: (
    cause: unknown,
  ) => NoInfer<Message>,
) =>
  Effect.fn(function*<R, K>(
    activeSubscriptions: HashMap.HashMap<K, Deferred.Deferred<void>>,
    subscriptions: HashMap.HashMap<
      K,
      Stream.Stream<Message, never, R>
    >,
  ) {
    const mutable = HashMap.beginMutation(activeSubscriptions)
    for (const [key, interruption] of activeSubscriptions) {
      if (HashMap.has(subscriptions, key)) {
        continue
      }
      HashMap.remove(mutable, key)
      yield* Deferred.succeed(interruption, undefined)
    }
    let streams = Array.empty<
      Stream.Stream<Message, never, R>
    >()
    for (const [key, stream] of subscriptions) {
      if (HashMap.has(mutable, key)) {
        continue
      }
      const interruption = yield* Deferred.make<void>()
      HashMap.set(mutable, key, interruption)
      const resilientStream = makeResilient(stream, makeDefectMessage)
      streams = Array.append(
        streams,
        resilientStream.pipe(
          Stream.interruptWhen(Deferred.await(interruption)),
        ),
      )
    }
    return [HashMap.endMutation(mutable), streams] as const
  }, Effect.uninterruptible)

const modifyState = <State, Message, R>(update: Update<State, Message, R>) =>
  Effect.fn(
    function*(state: State, message: Message) {
      const [newState, commands] = yield* Effect.sync(() => update(message)(state))
      return [newState, [{ commands, state: newState }]] as const
    },
    (effect, state) =>
      Effect.catchDefect(
        effect,
        Effect.fn(function*(defect) {
          yield* Effect.logError('Update function threw', defect)
          return [state, [{ commands: Array.empty(), state }]] as const
        }),
      ),
  )

export const prepare = <State, Message, R, S, K>({
  update,
  makeDefectMessage,
  emitter,
}: {
  update: Update<State, Message, R>
  makeDefectMessage: (
    cause: unknown,
  ) => NoInfer<Message>
  emitter?: Emitter<State, Message, S, K>
}) => {
  const iso = Newtype.makeIso<Engine<State, Message>>()
  const maybeEmitter = Option.fromUndefinedOr(emitter)
  return Effect.fn(function*([initState, initCommands]: Step<
    State,
    Message,
    R
  >) {
    const messageQueue = yield* Effect.acquireRelease(
      Queue.unbounded<Message>(),
      Queue.shutdown,
    )
    const transition$ = yield* Stream.fromQueue(messageQueue).pipe(
      Stream.mapAccumEffect(() => initState, modifyState(update)),
      Stream.merge(Stream.make({ commands: initCommands, state: initState })),
      Stream.broadcast({ capacity: 'unbounded', replay: 1 }),
    )
    const state$ = transition$.pipe(Stream.map(({ state }) => state))
    const fromCommand$ = transition$.pipe(
      Stream.map(({ commands }) => commands),
      Stream.flattenIterable,
      Stream.map(
        Effect.catchDefect(Function.flow(makeDefectMessage, Effect.succeed)),
      ),
      Stream.flattenEffect({ concurrency: 'unbounded', unordered: true }),
    )
    const fromSubs$ = Option.isSome(maybeEmitter)
      ? state$.pipe(
        Stream.mapEffect((state) =>
          Effect.catchDefect(
            Effect.sync(() => ({
              _tag: 'OK' as const,
              map: maybeEmitter.value(state),
            })),
            Effect.fn(function*(err) {
              yield* Effect.logError('Sub evaluation function threw', err)
              return { _tag: 'BAD' as const }
            }),
          )
        ),
        Stream.filter((emission) => emission._tag === 'OK'),
        Stream.map(
          ({ map }) => [HashSet.fromIterable(HashMap.keys(map)), map] as const,
        ),
        Stream.changesWith(([keys1], [keys2]) => Equal.equals(keys1, keys2)),
        Stream.map(([, subs]) => subs),
        Stream.mapAccumEffect(
          HashMap.empty<K, Deferred.Deferred<void>>,
          modifySubs(makeDefectMessage),
        ),
        Stream.flatten({ concurrency: 'unbounded' }),
      )
      : Stream.empty
    const requirementsS = yield* Effect.context<S>()
    const requirementsR = yield* Effect.context<R>()
    const message$ = Stream.provideContext(
      Stream.merge(fromSubs$, fromCommand$),
      Context.merge(requirementsR, requirementsS),
    )
    const hasStartedRef = yield* Ref.make(false)
    return iso.set({
      hasStartedRef,
      messageQueue,
      message$,
      state$,
    })
  })
}

export const dispatch = Function.dual<
  <Message>(
    that: Message,
  ) => <State>(self: Engine<State, Message>) => Effect.Effect<void>,
  <State, Message>(
    self: Engine<State, Message>,
    that: Message,
  ) => Effect.Effect<void>
>(
  2,
  Effect.fn(function*(stateManager, message) {
    const { messageQueue } = Newtype.value(stateManager)

    yield* Queue.offer(messageQueue, message)
  }),
)

export const states = <State, Message>(
  stateManager: Engine<State, Message>,
) => {
  const { state$, messageQueue, message$ } = Newtype.value(stateManager)

  return message$.pipe(
    Stream.tap((message) => Queue.offer(messageQueue, message)),
    Stream.drain,
    Stream.merge(state$),
    Stream.share({
      capacity: 'unbounded',
      idleTimeToLive: Duration.infinity,
      replay: 1,
    }),
    Stream.unwrap,
  )
}

export const Engine = <S, M>() => Context.Service<Engine<S, M>>('#fgaudo/fsm/Engine')

export const layer = <State, Message, R, S, K>({
  update,
  emitter,
  makeDefectMessage,
  init,
}: {
  makeDefectMessage: (
    cause: unknown,
  ) => NoInfer<Message>
  update: Update<State, Message, R>
  emitter: Emitter<State, Message, S, K>
  init: Step<State, Message, R>
}) =>
  Layer.effect(
    Engine<State, Message>(),
    prepare({ emitter, makeDefectMessage, update })(init),
  )
