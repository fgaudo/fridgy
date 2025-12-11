import * as Chunk from 'effect/Chunk'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
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

export type Subscriptions<M, R, K = unknown> = HashMap.HashMap<
	K,
	Stream.Stream<M, never, R>
>

export type StateManager<S, M, R> = {
	stateChanges: Stream.Stream<S>
	messages: Stream.Stream<M>
	start: Effect.Effect<void, never, R>
	dispatch: (m: M) => Effect.Effect<void>
}

export const makeStateManager = Effect.fn(function* <S, M, R>({
	update,
	initState,
	fatalMessage: _fatalMessage,
}: {
	update: Update<S, M, R>
	initState: S
	fatalMessage?: (err: unknown) => NoInfer<M>
}): Effect.fn.Return<StateManager<S, M, R>, never, Scope.Scope> {
	const maybeFatalMessage = Option.fromNullable(_fatalMessage)
	const stateRef = yield* SubscriptionRef.make(initState)
	const messagePubSub = yield* Effect.acquireRelease(
		PubSub.unbounded<M>(),
		pubSub => pubSub.shutdown,
	)
	const scope = yield* Scope.Scope
	const isStartedRef = yield* SynchronizedRef.make(false)

	const startUpdateLoop = pipe(
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
			Option.match(maybeFatalMessage, {
				onNone: () => Stream.empty,
				onSome: fatalMessage => Stream.make(fatalMessage(err)),
			}),
		),
		Stream.runForEach(messagePubSub.publish),
		Effect.forkScoped,
	)

	const start = pipe(
		isStartedRef,
		SynchronizedRef.updateEffect<boolean, Scope.Scope | R, never>(
			Effect.fn(function* (isStarted) {
				if (isStarted) {
					yield* Effect.logWarning('Update already started')
					return isStarted
				}

				yield* startUpdateLoop

				return true
			}),
		),
		Scope.extend(scope),
	)

	const stateChanges = yield* pipe(
		Effect.acquireRelease(
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
		),
		Effect.map(({ stream }) => stream),
	)

	return {
		stateChanges,
		start,
		messages: yield* Stream.fromPubSub(messagePubSub, { scoped: true }),
		dispatch: messagePubSub.publish,
	}
})

export const withSubscriptions = Effect.fn(function* <
	S,
	M extends { _tag: string | symbol },
	R,
	K = unknown,
>({
	makeStateManager,
	evaluateSubscriptions: computeSubscriptions,
	fatalMessage: _fatalMessage,
}: {
	makeStateManager: Effect.Effect<StateManager<S, M, R>, never, Scope.Scope>
	evaluateSubscriptions: (state: S) => Subscriptions<M, R, K>
	fatalMessage?: (err: unknown) => NoInfer<M>
}): Effect.fn.Return<StateManager<S, M, R>, never, Scope.Scope | R> {
	const stateManager = yield* makeStateManager
	const maybeFatalMessage = Option.fromNullable(_fatalMessage)

	const activeSubscriptionsRef = yield* SynchronizedRef.make(
		HashMap.empty<K, Deferred.Deferred<void>>(),
	)

	const updateActiveSubscriptions = (
		subscriptions: HashMap.HashMap<K, Stream.Stream<M, never, R>>,
	) =>
		SynchronizedRef.modifyEffect(
			activeSubscriptionsRef,
			Effect.fn(function* (
				activeSubscriptions: HashMap.HashMap<K, Deferred.Deferred<void>>,
			) {
				for (const [key, interruption] of activeSubscriptions) {
					if (HashMap.has(subscriptions, key)) {
						continue
					}

					activeSubscriptions = HashMap.remove(activeSubscriptions, key)
					yield* Deferred.succeed(interruption, undefined)
				}

				let streams = Chunk.empty<Stream.Stream<M, never, R>>()

				for (const [key, stream] of subscriptions) {
					if (HashMap.has(activeSubscriptions, key)) {
						continue
					}

					const interruption = yield* Deferred.make<void>()
					activeSubscriptions = HashMap.set(
						activeSubscriptions,
						key,
						interruption,
					)
					streams = Chunk.append(
						streams,
						Stream.interruptWhenDeferred(stream, interruption),
					)
				}

				return [streams, activeSubscriptions] as const
			}),
		)

	const scope = yield* Scope.Scope

	return {
		...stateManager,
		start: Scope.extend(
			Effect.gen(function* () {
				yield* stateManager.start

				yield* pipe(
					stateManager.stateChanges,
					Stream.changesWith((s1, s2) => s1 === s2),
					Stream.map(computeSubscriptions),
					Stream.mapEffect(updateActiveSubscriptions),
					Stream.flattenChunks,
					Stream.flatten({ concurrency: 'unbounded' }),
					Stream.catchAllCause(err =>
						Option.match(maybeFatalMessage, {
							onNone: () => Stream.empty,
							onSome: fatalMessage => Stream.make(fatalMessage(err)),
						}),
					),
					Stream.runForEach(stateManager.dispatch),
					Effect.forkScoped,
				)
			}),
			scope,
		),
	}
})
