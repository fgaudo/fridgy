import type * as Array from 'effect/Array'
import * as Cause from 'effect/Cause'
import * as Chunk from 'effect/Chunk'
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

export type Transition<State, Message, R> = readonly [
	State,
	ReadonlyArray<Command<Message, R>>,
]

export type Event<State, Message> = readonly [State, Option.Option<Message>]

export type Update<State, Message, R> = (
	message: Message,
) => (state: State) => Transition<State, Message, R>

export type Subscriptions<State, Message, R, K = unknown> = (
	s: State,
) => HashMap.HashMap<
	K,
	Stream.Stream<Array.NonEmptyReadonlyArray<Message>, never, R>
>

export type StateManager<State, Message, R, K> = Newtype.Newtype<
	'StateManager',
	{
		isRunningRef: Ref.Ref<boolean>
		stateRef: SubscriptionRef.SubscriptionRef<Event<State, Message>>
		messageQueue: Queue.Queue<Message>
		update: Update<State, Message, R>
		initCommands: ReadonlyArray<Command<Message, R>>
		defectMessage: (
			errors: ReadonlyArray<Error>,
		) => Array.NonEmptyReadonlyArray<Message>
		shutdownSignal: Deferred.Deferred<void>
		maybeSubsEvaluation: Option.Option<Subscriptions<State, Message, R, K>>
	}
>

export const prepare = <State, Message, R, K>({
	update,
	defectMessage,
	subscriptions,
}: {
	update: Update<State, Message, R>
	defectMessage: (
		errors: ReadonlyArray<Error>,
	) => NoInfer<Array.NonEmptyReadonlyArray<Message>>
	subscriptions?: Subscriptions<State, Message, R, K>
}) => {
	const iso = Newtype.makeIso<StateManager<State, Message, R, K>>()
	const maybeSubsEvaluation = Option.fromUndefinedOr(subscriptions)
	return Effect.fn(function* ([initState, initCommands]: Transition<
		State,
		Message,
		R
	>) {
		const stateRef = yield* Effect.acquireRelease(
			SubscriptionRef.make([initState, Option.none<Message>()] as const),
			ref => PubSub.shutdown(ref.pubsub),
		)
		const messageQueue = yield* Effect.acquireRelease(
			Queue.unbounded<Message>(),
			Queue.shutdown,
		)
		const shutdownSignal = yield* Effect.acquireRelease(
			Deferred.make<void>(),
			Deferred.succeed<void>(undefined),
		)
		const isRunningRef = yield* Ref.make(false)
		return iso.set({
			defectMessage,
			maybeSubsEvaluation,
			stateRef,
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
		that: Message,
	) => <State, R, K>(
		self: StateManager<State, Message, R, K>,
	) => Effect.Effect<void>,
	<State, Message, R, K>(
		self: StateManager<State, Message, R, K>,
		that: Message,
	) => Effect.Effect<void>
>(
	2,
	Effect.fn(function* (stateManager, message) {
		const { messageQueue, shutdownSignal } = Newtype.value(stateManager)
		if (Deferred.isDoneUnsafe(shutdownSignal)) {
			return yield* Effect.logWarning('State manager is no longer available')
		}
		yield* Queue.offer(messageQueue, message)
	}),
)

export const stateChanges = <State, Message, R, K>(
	stateManager: StateManager<State, Message, R, K>,
) => {
	const { stateRef, shutdownSignal } = Newtype.value(stateManager)
	return SubscriptionRef.changes(stateRef).pipe(
		Stream.interruptWhen(Deferred.await(shutdownSignal)),
	)
}

export const runLoop = Effect.fn('StateManager runloop')(function* <
	State,
	Message,
	R,
	K,
>(stateManager: StateManager<State, Message, R, K>) {
	const {
		defectMessage,
		maybeSubsEvaluation,
		messageQueue,
		initCommands,
		isRunningRef,
		shutdownSignal,
		stateRef,
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
		Stream.mapEffect(message =>
			SubscriptionRef.modify(stateRef, ([state]) => {
				const [newState, commands] = update(message)(state)
				return [commands, [newState, Option.some(message)] as const] as const
			}),
		),
		Stream.flattenIterable,
		Stream.merge(Stream.make(...initCommands)),
		Stream.flattenEffect({ concurrency: 'unbounded', unordered: true }),
	)
	const message$ = yield* Option.match(maybeSubsEvaluation, {
		onNone: () => Effect.succeed(updateMessage$),
		onSome: Effect.fn(function* (subsEvaluation) {
			const isReady = yield* Deferred.make<void>()
			return stateChanges(stateManager).pipe(
				Stream.onStart(
					Effect.gen(function* () {
						yield* Effect.logDebug('Subs started')
						yield* Deferred.succeed(isReady, undefined)
					}),
				),
				Stream.map(([state]) => subsEvaluation(state)),
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
							Chunk.empty<
								Stream.Stream<Array.NonEmptyReadonlyArray<Message>, never, R>
							>()
						for (const [key, stream] of subscriptions) {
							if (HashMap.has(mutable, key)) {
								continue
							}
							const interruption = yield* Deferred.make<void>()
							HashMap.set(mutable, key, interruption)
							streams = Chunk.append(
								streams,
								Stream.interruptWhen(stream, Deferred.await(interruption)),
							)
						}
						return [
							HashMap.endMutation(mutable),
							Chunk.toReadonlyArray(streams),
						] as const
					}),
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
		Stream.onStart(Effect.logDebug('Main loop started')),
		Stream.catchCause(cause =>
			cause.pipe(Cause.prettyErrors, defectMessage, Stream.make),
		),
		Stream.interruptWhen(Deferred.await(shutdownSignal)),
		Stream.flattenIterable,
		Stream.runForEach(message => dispatch(stateManager, message)),
		Effect.flatMap(() => Effect.never),
	)
}, Effect.scoped)
