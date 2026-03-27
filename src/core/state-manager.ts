import * as Cause from 'effect/Cause'
import * as Chunk from 'effect/Chunk'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Function from 'effect/Function'
import { pipe, flow } from 'effect/Function'
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

export type Update<State, Message, R> = (
	message: Message,
) => (state: State) => Transition<State, Message, R>

export type Subscriptions<State, Message, R> = (
	s: State,
) => HashMap.HashMap<unknown, Stream.Stream<Message, never, R>>

export type StateManager<State, Message, R> = Newtype.Newtype<
	'StateManager',
	StateManagerImpl<State, Message, R>
>

type StateManagerImpl<State, Message, R> = {
	isStartedRef: Ref.Ref<boolean>
	stateRef: SubscriptionRef.SubscriptionRef<State>
	messagePubSub: PubSub.PubSub<Message>
	messageQueue: Queue.Queue<Message>
	update: Update<State, Message, R>
	initCommands: Command<Message, R>[]
	defectMessage: (errors: Error[]) => Message
	maybeSubsEvaluation: Option.Option<Subscriptions<State, Message, R>>
	scope: Scope.Scope
}

export const makeScoped = Effect.fnUntraced(function* <State, Message, R>(
	[initState, initCommands]: Transition<State, Message, R>,
	update: Update<State, Message, R>,
	defectMessage: (errors: Error[]) => NoInfer<Message>,
	options: {
		subscriptions?: Subscriptions<State, Message, R>
	},
): Effect.fn.Return<StateManager<State, Message, R>, never, Scope.Scope> {
	const iso = Newtype.makeIso<StateManager<State, Message, R>>()

	const maybeSubsEvaluation = pipe(
		Option.fromUndefinedOr(options),
		Option.flatMap(opt => Option.fromUndefinedOr(opt.subscriptions)),
	)

	const stateRef = yield* Effect.acquireRelease(
		SubscriptionRef.make(initState),
		ref => PubSub.shutdown(ref.pubsub),
	)

	const messageQueue = yield* Effect.acquireRelease(
		Queue.unbounded<Message>(),
		Queue.shutdown,
	)

	const messagePubSub = yield* Effect.acquireRelease(
		PubSub.unbounded<Message>(),
		PubSub.shutdown,
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
		messagePubSub,
		messageQueue,
		scope,
	})
})

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
		const iso = Newtype.makeIso<typeof stateManager>()

		const { messageQueue } = iso.get(stateManager)

		return yield* Queue.offer(messageQueue, message)
	}),
)

export const messages = <State, Message, R>(
	stateManager: StateManager<State, Message, R>,
) => {
	const iso = Newtype.makeIso<typeof stateManager>()
	const { messagePubSub } = iso.get(stateManager)

	return Stream.fromPubSub(messagePubSub)
}

export const stateChanges = <State, Message, R>(
	stateManager: StateManager<State, Message, R>,
) => {
	const iso = Newtype.makeIso<typeof stateManager>()
	const { stateRef } = iso.get(stateManager)
	return SubscriptionRef.changes(stateRef)
}

export const start = Effect.fnUntraced(function* <State, Message, R>(
	stateManager: StateManager<State, Message, R>,
) {
	const iso = Newtype.makeIso<typeof stateManager>()

	const isStartedRef = iso.key('isStartedRef').get(stateManager)

	if (yield* Ref.getAndSet(isStartedRef, true)) {
		yield* Effect.logWarning('State manager already started')
		return
	}

	const {
		defectMessage,
		maybeSubsEvaluation,
		messagePubSub,
		messageQueue,
		initCommands,
		scope,
		stateRef,
		update,
	} = iso.get(stateManager)

	const updateMessage$ = pipe(
		Stream.fromQueue(messageQueue),
		Stream.onStart(Effect.logDebug('Update loop started')),
		Stream.mapEffect(message =>
			SubscriptionRef.modifySome(stateRef, state => {
				const [newState, commands] = update(message)(state)

				if (Equal.equals(newState, state)) {
					return [[message, commands] as const, Option.none()]
				}

				return [[message, commands] as const, Option.some(newState)]
			}),
		),
		Stream.tap(([message]) => PubSub.publish(messagePubSub, message)),
		Stream.map(([, commands]) => commands),
		Stream.flattenIterable,
		Stream.merge(Stream.make(...initCommands)),
		Stream.flattenEffect({ concurrency: 'unbounded', unordered: true }),
	)

	const message$ = yield* Option.match(maybeSubsEvaluation, {
		onNone: () => Effect.succeed(updateMessage$),
		onSome: Effect.fnUntraced(function* (subsEvaluation) {
			const isReady = yield* Deferred.make<void>()

			return pipe(
				stateChanges(stateManager),
				Stream.onStart(
					Effect.gen(function* () {
						yield* Effect.logDebug('Subs started')
						yield* Deferred.succeed(isReady, undefined)
					}),
				),
				Stream.map(subsEvaluation),
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

	yield* pipe(
		message$,
		Stream.onStart(Effect.logDebug('State manager started')),
		Stream.catchCause(flow(Cause.prettyErrors, defectMessage, Stream.make)),
		Stream.runForEach(message => dispatch(stateManager, message)),
		Effect.forkIn(scope),
	)
})
