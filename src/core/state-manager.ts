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
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'

export type Command<Message, R> = Effect.Effect<Message, never, R>

export type Transition<State, Message, R> = readonly [
	State,
	Command<Message, R>[],
]

export type Event<State, Message> = readonly [State, Option.Option<Message>]

export type Update<State, Message, R> = (
	message: Message,
) => (state: State) => Transition<State, Message, R>

export type Subscriptions<State, Message, R> = (
	s: State,
) => HashMap.HashMap<unknown, Stream.Stream<Message, never, R>>

export type StateManager<State, Message, R> = Newtype.Newtype<
	'StateManager',
	{
		isStartedRef: Ref.Ref<boolean>
		stateRef: SubscriptionRef.SubscriptionRef<Event<State, Message>>
		messageQueue: Queue.Queue<Message>
		update: Update<State, Message, R>
		initCommands: Command<Message, R>[]
		defectMessage: (errors: Error[]) => Message
		maybeSubsEvaluation: Option.Option<Subscriptions<State, Message, R>>
		scope: Scope.Scope
	}
>

export const prepare = <State, Message, R>({
	update,
	defectMessage,
	subscriptions,
}: {
	update: Update<State, Message, R>
	defectMessage: (errors: Error[]) => NoInfer<Message>
	subscriptions?: Subscriptions<State, Message, R>
}) => {
	const iso = Newtype.makeIso<StateManager<State, Message, R>>()

	const maybeSubsEvaluation = Option.fromUndefinedOr(subscriptions)

	return Effect.fnUntraced(function* ([initState, initCommands]: Transition<
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

		const isStartedRef = yield* Ref.make(false)
		const scope = yield* Scope.Scope

		return iso.set({
			defectMessage,
			maybeSubsEvaluation,
			stateRef,
			update,
			initCommands,
			isStartedRef,
			messageQueue,
			scope,
		})
	})
}

export const dispatch = Function.dual<
	<Message>(
		that: Message,
	) => <State, R>(self: StateManager<State, Message, R>) => Effect.Effect<void>,
	<State, Message, R>(
		self: StateManager<State, Message, R>,
		that: Message,
	) => Effect.Effect<void>
>(
	2,
	Effect.fnUntraced(function* (stateManager, message) {
		const { messageQueue } = Newtype.value(stateManager)

		return yield* Queue.offer(messageQueue, message)
	}),
)

export const stateChanges = <State, Message, R>(
	stateManager: StateManager<State, Message, R>,
) => {
	const { stateRef } = Newtype.value(stateManager)
	return SubscriptionRef.changes(stateRef)
}

export const start = Effect.fnUntraced(function* <State, Message, R>(
	stateManager: StateManager<State, Message, R>,
) {
	const {
		defectMessage,
		maybeSubsEvaluation,
		messageQueue,
		initCommands,
		scope,
		stateRef,
		update,
		isStartedRef,
	} = Newtype.value(stateManager)

	if (yield* Ref.getAndSet(isStartedRef, true)) {
		yield* Effect.logWarning('State manager already started')
		return
	}

	const updateMessage$ = Stream.fromQueue(messageQueue).pipe(
		Stream.onStart(Effect.logDebug('Update loop started')),
		Stream.mapEffect(message =>
			SubscriptionRef.modify(stateRef, ([state]) => {
				const [newState, commands] = update(message)(state)

				return [commands, [newState, Option.some(message)] as const]
			}),
		),
		Stream.flattenIterable,
		Stream.merge(Stream.make(...initCommands)),
		Stream.flattenEffect({ concurrency: 'unbounded', unordered: true }),
	)

	const message$ = yield* Option.match(maybeSubsEvaluation, {
		onNone: () => Effect.succeed(updateMessage$),
		onSome: Effect.fnUntraced(function* (subsEvaluation) {
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
					() => HashMap.empty<unknown, Deferred.Deferred<void>>(),
					Effect.fnUntraced(function* (activeSubscriptions, subscriptions) {
						const mutable = HashMap.beginMutation(activeSubscriptions)

						for (const [key, interruption] of activeSubscriptions) {
							if (HashMap.has(subscriptions, key)) {
								continue
							}
							HashMap.remove(mutable, key)
							yield* Deferred.succeed(interruption, undefined)
						}

						let streams = Chunk.empty<Stream.Stream<Message, never, R>>()

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

	yield* Effect.logDebug('Starting state manager')

	yield* message$.pipe(
		Stream.onStart(Effect.logDebug('State manager started')),
		Stream.catchCause(cause =>
			cause.pipe(Cause.prettyErrors, defectMessage, Stream.make),
		),
		Stream.runForEach(message => dispatch(stateManager, message)),
		Effect.forkIn(scope),
	)
})
