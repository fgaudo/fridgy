import * as Chunk from 'effect/Chunk'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Fiber from 'effect/Fiber'
import { identity, pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Option from 'effect/Option'
import * as PubSub from 'effect/PubSub'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as SynchronizedRef from 'effect/SynchronizedRef'

export type Command<M, R> = Effect.Effect<M, never, R>

export type Update<S, M, R> = (message: M) => (state: S) => {
	state: S
	commands: Chunk.Chunk<Command<M, R>>
}

export type Subscriptions<S, M, R> = (
	state: S,
) => HashMap.HashMap<unknown, Stream.Stream<M, never, R>>

export type StateManager<S, M, R> = {
	stateChanges: Stream.Stream<S>
	messages: Stream.Stream<M>
	start: Effect.Effect<void, never, R>
	dispatch: (m: M) => Effect.Effect<void>
}

export const makeStateManager = Effect.fn(function* <
	S,
	M extends { _tag: string | symbol },
	R,
>({
	initState,
	initMessages,
	update,
	subscriptions: _subscriptions,
	fatalMessage,
	fatalMessageSubscription,
}: {
	initState: S
	initMessages?: readonly [M, ...M[]]
	subscriptions?: Subscriptions<S, M, R>
	update: Update<S, M, R>
	fatalMessage?: (err: unknown) => NoInfer<M>
	fatalMessageSubscription?: (err: unknown) => NoInfer<M>
}): Effect.fn.Return<StateManager<S, M, R>, never, Scope.Scope> {
	const stateRef = yield* SubscriptionRef.make(initState)
	const messagePubSub = yield* Effect.acquireRelease(
		PubSub.unbounded<M>(),
		pubSub => pubSub.shutdown,
	)
	const isStartedRef = yield* SynchronizedRef.make<boolean>(false)
	const scope = yield* Scope.Scope

	const updateLoop = pipe(
		Stream.fromPubSub(messagePubSub),
		Stream.map(update),
		Stream.mapEffect(transition =>
			SubscriptionRef.modify(stateRef, s => {
				const { state, commands } = transition(s)
				return [commands, state]
			}),
		),
		Stream.flattenChunks,
		Stream.flattenEffect({ concurrency: 'unbounded', unordered: true }),
		Stream.catchAllCause(err =>
			fatalMessage ? Stream.make(fatalMessage(err)) : Stream.empty,
		),
		Stream.runForEach(messagePubSub.publish),
		Effect.fork,
		Effect.acquireRelease(Fiber.interrupt),
	)

	const maybeSubscriptionsLoop = Option.gen(function* () {
		const subscriptions = yield* Option.fromNullable(_subscriptions)

		const effect = Effect.gen(function* () {
			const activeStreamsRef = yield* SynchronizedRef.make(
				HashMap.empty<unknown, Deferred.Deferred<void>>(),
			)

			return yield* pipe(
				stateRef.changes,
				Stream.changesWith((s1, s2) => s1 === s2),
				Stream.map(subscriptions),
				Stream.mapEffect(newStreams =>
					SynchronizedRef.modifyEffect(
						activeStreamsRef,
						Effect.fn(function* (activeStreams) {
							for (const [key, interruption] of activeStreams) {
								if (HashMap.has(newStreams, key)) {
									continue
								}

								activeStreams = HashMap.remove(activeStreams, key)
								yield* Deferred.succeed(interruption, undefined)
							}

							let streams = Chunk.empty<Stream.Stream<M, never, R>>()

							for (const [key, stream] of newStreams) {
								if (HashMap.has(activeStreams, key)) {
									continue
								}

								const interruption = yield* Deferred.make<void>()
								activeStreams = HashMap.set(activeStreams, key, interruption)
								streams = Chunk.append(
									streams,
									Stream.interruptWhenDeferred(stream, interruption),
								)
							}

							return [streams, activeStreams]
						}),
					),
				),
				Stream.flattenChunks,
				Stream.flatten({ concurrency: 'unbounded' }),
				Stream.catchAllCause(err =>
					fatalMessageSubscription
						? Stream.make(fatalMessageSubscription(err))
						: Stream.empty,
				),
				Stream.runForEach(messagePubSub.publish),
				Effect.fork,
				Effect.acquireRelease(Fiber.interrupt),
			)
		})

		return effect
	})

	const stateChanges = (yield* Effect.acquireRelease(
		Effect.gen(function* () {
			const interruption = yield* Deferred.make<undefined>()

			return {
				stream: pipe(
					stateRef.changes,
					Stream.changesWith((s1, s2) => s1 === s2),
					Stream.interruptWhenDeferred(interruption),
				),
				interruption,
			}
		}),
		({ interruption }) => Deferred.succeed(interruption, undefined),
	)).stream

	return {
		stateChanges,
		messages: Stream.fromPubSub(messagePubSub),
		start: pipe(
			SynchronizedRef.updateEffect(
				isStartedRef,
				Effect.fn(function* (isStarted) {
					if (isStarted) {
						yield* Effect.logWarning('State manager already started')
						return isStarted
					}

					if (initMessages) {
						yield* PubSub.publishAll(messagePubSub, initMessages)
					}

					if (Option.isSome(maybeSubscriptionsLoop)) {
						yield* maybeSubscriptionsLoop.value
					}

					yield* updateLoop

					return true
				}),
			),
			Scope.extend(scope),
		),

		dispatch: Effect.fn(function* (m: M) {
			yield* messagePubSub.publish(m)
		}),
	}
})
