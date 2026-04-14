import * as Array from 'effect/Array'
import * as Cause from 'effect/Cause'
import type * as Data from 'effect/Data'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Function from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Newtype from 'effect/Newtype'
import * as Option from 'effect/Option'
import * as PubSub from 'effect/PubSub'
import * as Queue from 'effect/Queue'
import * as Ref from 'effect/Ref'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'

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

export type Engine<State, Message, R, K> = Newtype.Newtype<
	'#fgaudo/fsm/Engine',
	{
		isRunningRef: Ref.Ref<boolean>
		transitionRef: SubscriptionRef.SubscriptionRef<Transition<State, Message>>
		messageQueue: Queue.Queue<Array.NonEmptyReadonlyArray<Message>>
		update: Update<State, Message, R>
		initCommands: ReadonlyArray<Command<Message, R>>
		handleDefect: (
			errors: ReadonlyArray<Error>,
		) => Array.NonEmptyReadonlyArray<Message>
		shutdownSignal: Deferred.Deferred<void>
		maybeEmitter: Option.Option<Emitter<State, Message, R, K>>
	}
>

export const prepare = <State, Message, R, K>({
	update,
	handleDefect,
	emitter,
}: {
	update: Update<State, Message, R>
	handleDefect: (
		errors: ReadonlyArray<Error>,
	) => NoInfer<Array.NonEmptyReadonlyArray<Message>>
	emitter?: Emitter<State, Message, R, K>
}) => {
	const iso = Newtype.makeIso<Engine<State, Message, R, K>>()
	const maybeEmitter = Option.fromUndefinedOr(emitter)
	return Effect.fn(function* ([initState, initCommands]: Step<
		State,
		Message,
		R
	>) {
		const transitionRef = yield* Effect.acquireRelease(
			SubscriptionRef.make<Transition<State, Message>>({
				_tag: 'Initial',
				state: initState,
			}),
			ref => PubSub.shutdown(ref.pubsub),
		)
		const messageQueue = yield* Effect.acquireRelease(
			Queue.unbounded<Array.NonEmptyReadonlyArray<Message>>(),
			Queue.shutdown,
		)
		const shutdownSignal = yield* Effect.acquireRelease(
			Deferred.make<void>(),
			Deferred.succeed<void>(undefined),
		)
		const isRunningRef = yield* Ref.make(false)
		return iso.set({
			handleDefect,
			maybeEmitter,
			transitionRef,
			update,
			shutdownSignal,
			initCommands,
			isRunningRef,
			messageQueue,
		})
	})
}

export const dispatch = Function.dual<
	<Message>(
		that: Array.NonEmptyReadonlyArray<Message>,
	) => <State, R, K>(self: Engine<State, Message, R, K>) => Effect.Effect<void>,
	<State, Message, R, K>(
		self: Engine<State, Message, R, K>,
		that: Array.NonEmptyReadonlyArray<Message>,
	) => Effect.Effect<void>
>(
	2,
	Effect.fn(function* (stateManager, messages) {
		const { messageQueue, shutdownSignal } = Newtype.value(stateManager)

		if (Deferred.isDoneUnsafe(shutdownSignal)) {
			return yield* Effect.logWarning('State manager is no longer available')
		}
		Queue.offerUnsafe(messageQueue, messages)
	}),
)

export const transitions = <State, Message, R, K>(
	stateManager: Engine<State, Message, R, K>,
) => {
	const { transitionRef, shutdownSignal } = Newtype.value(stateManager)
	return SubscriptionRef.changes(transitionRef).pipe(
		Stream.interruptWhen(Deferred.await(shutdownSignal)),
	)
}

export const runLoop = Effect.fn('StateManager runloop')(function* <
	State,
	Message,
	R,
	K,
>(stateManager: Engine<State, Message, R, K>) {
	const {
		handleDefect,
		maybeEmitter: maybeSubsEvaluation,
		messageQueue,
		initCommands,
		isRunningRef,
		shutdownSignal,
		transitionRef,
		update,
	} = Newtype.value(stateManager)
	if (yield* Deferred.isDone(shutdownSignal)) {
		return yield* Effect.logWarning('State manager is no longer available')
	}
	const isRunning = yield* Effect.acquireRelease(
		Ref.getAndSet(isRunningRef, true),
		isRunning => (isRunning ? Effect.void : Ref.set(isRunningRef, false)),
	)
	if (isRunning) {
		return yield* Effect.logWarning('Already running')
	}
	const updateMessage$ = Stream.fromQueue(messageQueue).pipe(
		Stream.onStart(Effect.logDebug('Update loop started')),
		Stream.mapEffect(messages =>
			SubscriptionRef.modify(transitionRef, ({ state }) => {
				const [newState, commands] = Array.reduce(
					messages,
					[state, Array.empty<Command<Message, R>>()] as const,
					([s, commands], message) => {
						const [newState, newCommands] = update(message)(s)
						return [newState, Array.appendAll(commands, newCommands)] as const
					},
				)
				return [
					commands,
					{ _tag: 'Subsequent', state: newState, messages },
				] as const
			}),
		),
		Stream.flattenIterable,
		Stream.flattenIterable,
		Stream.merge(Stream.make(...initCommands)),
		Stream.flattenEffect({ concurrency: 'unbounded', unordered: true }),
	)
	const message$ = yield* Option.match(maybeSubsEvaluation, {
		onNone: () => Effect.succeed(updateMessage$),
		onSome: Effect.fn(function* (subsEvaluation) {
			const isReady = yield* Deferred.make<void>()
			return transitions(stateManager).pipe(
				Stream.onStart(
					Effect.gen(function* () {
						yield* Effect.logDebug('Subs started')
						yield* Deferred.succeed(isReady, undefined)
					}),
				),
				Stream.map(({ state }) => subsEvaluation(state)),
				Stream.map(
					map => [HashSet.fromIterable(HashMap.keys(map)), map] as const,
				),
				Stream.changesWith(([keys1], [keys2]) => Equal.equals(keys1, keys2)),
				Stream.map(([, subs]) => subs),
				Stream.mapAccumEffect(
					HashMap.empty<K, Deferred.Deferred<void>>,
					Effect.fn(function* (activeSubscriptions, subscriptions) {
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
							streams = Array.append(
								streams,
								Stream.interruptWhen(stream, Deferred.await(interruption)),
							)
						}
						return [HashMap.endMutation(mutable), streams] as const
					}, Effect.uninterruptible),
				),
				Stream.flatten({ concurrency: 'unbounded' }),
				Stream.merge(
					Stream.unwrap(
						Effect.gen(function* () {
							yield* Deferred.await(isReady)
							return updateMessage$
						}),
					),
				),
			)
		}),
	})
	yield* Effect.logDebug('Starting main loop')
	return yield* message$.pipe(
		Stream.catchCause(cause =>
			cause.pipe(Cause.prettyErrors, handleDefect, Stream.make),
		),
		Stream.interruptWhen(Deferred.await(shutdownSignal)),
		Stream.runForEach(messages => dispatch(stateManager, messages)),
		Effect.flatMap(() => Effect.never),
	)
}, Effect.scoped)
