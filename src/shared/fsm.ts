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
	Array.NonEmptyReadonlyArray<Message>,
	never,
	R
>

export type Step<State, Message, R> = readonly [
	State,
	ReadonlyArray<Command<Message, R>>,
]

export type Transition<State, Message> = Data.TaggedEnum<{
	Initial: { state: State }
	Subsequent: { state: State; messages: Array.NonEmptyReadonlyArray<Message> }
}>

export type Update<State, Message, R> = (
	message: Message,
) => (state: State) => Step<State, Message, R>

export type Emitter<State, Message, R, K = unknown> = (
	s: State,
) => HashMap.HashMap<
	K,
	Stream.Stream<Array.NonEmptyReadonlyArray<Message>, never, R>
>

export type Engine<State, Message> = Newtype.Newtype<
	'#fgaudo/fsm/Engine',
	{
		messageQueue: Queue.Queue<Array.NonEmptyReadonlyArray<Message>>
		messages$: Stream.Stream<Array.NonEmptyReadonlyArray<Message>>
		state$: Stream.Stream<State>
		hasStartedRef: Ref.Ref<boolean>
	}
>

const modifySubs = <Message>(
	makeDefectMessages: (
		cause: unknown,
	) => NoInfer<Array.NonEmptyReadonlyArray<Message>>,
) =>
	Effect.fn(function* <R, K>(
		activeSubscriptions: HashMap.HashMap<K, Deferred.Deferred<void>>,
		subscriptions: HashMap.HashMap<
			K,
			Stream.Stream<readonly [Message, ...ReadonlyArray<Message>], never, R>
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
		let streams =
			Array.empty<
				Stream.Stream<Array.NonEmptyReadonlyArray<Message>, never, R>
			>()
		for (const [key, stream] of subscriptions) {
			if (HashMap.has(mutable, key)) {
				continue
			}
			const interruption = yield* Deferred.make<void>()
			HashMap.set(mutable, key, interruption)
			const recursiveStream: Stream.Stream<
				readonly [Message, ...ReadonlyArray<Message>],
				never,
				R
			> = Stream.suspend(() =>
				stream.pipe(
					Stream.catchCauseIf(
						cause => !Cause.hasInterrupts(cause),
						cause =>
							Stream.concat(
								Stream.make(makeDefectMessages(cause)),
								Stream.unwrap(
									Effect.gen(function* () {
										yield* Effect.sleep('1 second')
										return recursiveStream
									}),
								),
							),
					),
				),
			)
			streams = Array.append(
				streams,
				recursiveStream.pipe(
					Stream.interruptWhen(Deferred.await(interruption)),
				),
			)
		}
		return [HashMap.endMutation(mutable), streams] as const
	}, Effect.uninterruptible)

const modifyState = <State, Message, R>(update: Update<State, Message, R>) =>
	Effect.fn(
		function* (state: State, messages: ReadonlyArray<Message>) {
			const [newState, commands] = Array.reduce(
				messages,
				[state, Array.empty<Command<Message, R>>()] as const,
				([s, commands], message) => {
					const [newState, newCommands] = update(message)(s)
					return [newState, Array.appendAll(commands, newCommands)] as const
				},
			)
			return [newState, [{ commands, state: newState }]] as const
		},
		(effect, state) =>
			Effect.catchDefect(
				effect,
				Effect.fn(function* (defect) {
					yield* Effect.logError('Update function threw', defect)
					return [state, [{ commands: Array.empty(), state }]] as const
				}),
			),
	)

export const prepare = <State, Message, R, K>({
	update,
	makeDefectMessages,
	emitter,
}: {
	update: Update<State, Message, R>
	makeDefectMessages: (
		cause: unknown,
	) => NoInfer<Array.NonEmptyReadonlyArray<Message>>
	emitter?: Emitter<State, Message, R, K>
}) => {
	const iso = Newtype.makeIso<Engine<State, Message>>()
	const maybeEmitter = Option.fromUndefinedOr(emitter)
	return Effect.fn(function* ([initState, initCommands]: Step<
		State,
		Message,
		R
	>) {
		const messageQueue = yield* Effect.acquireRelease(
			Queue.unbounded<Array.NonEmptyReadonlyArray<Message>>(),
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
				Effect.catchDefect(Function.flow(makeDefectMessages, Effect.succeed)),
			),
			Stream.flattenEffect({ concurrency: 'unbounded', unordered: true }),
		)
		const fromSubs$ = Option.isSome(maybeEmitter)
			? state$.pipe(
					Stream.mapEffect(state =>
						Effect.catchDefect(
							Effect.sync(() => ({
								_tag: 'OK' as const,
								map: maybeEmitter.value(state),
							})),
							Effect.fn(function* (err) {
								yield* Effect.logError('Sub evaluation function threw', err)
								return { _tag: 'BAD' as const }
							}),
						),
					),
					Stream.filter(emission => emission._tag === 'OK'),
					Stream.map(
						({ map }) =>
							[HashSet.fromIterable(HashMap.keys(map)), map] as const,
					),
					Stream.changesWith(([keys1], [keys2]) => Equal.equals(keys1, keys2)),
					Stream.map(([, subs]) => subs),
					Stream.mapAccumEffect(
						HashMap.empty<K, Deferred.Deferred<void>>,
						modifySubs(makeDefectMessages),
					),
					Stream.flatten({ concurrency: 'unbounded' }),
				)
			: Stream.empty
		const requirements = yield* Effect.context<R>()
		const messages$ = Stream.provideContext(
			Stream.merge(fromSubs$, fromCommand$),
			requirements,
		)
		const hasStartedRef = yield* Ref.make(false)
		return iso.set({
			hasStartedRef,
			messageQueue,
			messages$,
			state$,
		})
	})
}

export const dispatch = Function.dual<
	<Message>(
		that: Array.NonEmptyReadonlyArray<Message>,
	) => <State>(self: Engine<State, Message>) => Effect.Effect<void>,
	<State, Message>(
		self: Engine<State, Message>,
		that: Array.NonEmptyReadonlyArray<Message>,
	) => Effect.Effect<void>
>(
	2,
	Effect.fn(function* (stateManager, messages) {
		const { messageQueue } = Newtype.value(stateManager)

		yield* Queue.offer(messageQueue, messages)
	}),
)

export const states = <State, Message>(
	stateManager: Engine<State, Message>,
) => {
	const { state$, messageQueue, messages$ } = Newtype.value(stateManager)

	return messages$.pipe(
		Stream.tap(message => Queue.offer(messageQueue, message)),
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

export const Engine = <S, M>() =>
	Context.Service<Engine<S, M>>('#fgaudo/fsm/Engine')

export const layer = <S, M, R, K>({
	update,
	emitter,
	makeDefectMessages,
	init,
}: {
	makeDefectMessages: (
		cause: unknown,
	) => NoInfer<Array.NonEmptyReadonlyArray<M>>
	update: Update<S, M, R>
	emitter: Emitter<S, M, R, K>
	init: Step<S, M, R>
}) =>
	Layer.effect(
		Engine<S, M>(),
		prepare({ emitter, makeDefectMessages, update })(init),
	)
