import * as Chunk from 'effect/Chunk'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Function from 'effect/Function'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Option from 'effect/Option'
import * as PubSub from 'effect/PubSub'
import * as Ref from 'effect/Ref'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as SynchronizedRef from 'effect/SynchronizedRef'

export type Command<M, R> = Effect.Effect<M, never, R>

export type Update<S, M, R> = (message: M) => (state: S) => {
	state: S
	commands: Chunk.Chunk<Command<M, R>>
}

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
	const isStartedRef = yield* Ref.make(false)
	const messages = Stream.fromPubSub(messagePubSub)

	const start = pipe(
		Ref.getAndSet(isStartedRef, true),
		Effect.tap(isStarted =>
			isStarted
				? Effect.logWarning('State manager already started')
				: Effect.logDebug('Starting state manager'),
		),
		Stream.whenCaseEffect(isStarted =>
			isStarted ? Option.none() : Option.some(messages),
		),
		Stream.onStart(Effect.logDebug('State manager started')),
		Stream.map(update),
		Stream.mapEffect(transition =>
			SubscriptionRef.modify(stateRef, s => {
				const { state, commands } = transition(s)
				return [commands, state]
			}),
		),
		Stream.flattenChunks,
		Stream.flatMap(
			Stream.catchAllCause(err =>
				Option.match(maybeFatalMessage, {
					onNone: () => Stream.empty,
					onSome: fatalMessage => Stream.make(fatalMessage(err)),
				}),
			),
			{ concurrency: 'unbounded' },
		),
		Stream.runForEach(messagePubSub.publish),
		Effect.forkScoped,
		Effect.asVoid,
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
		messages,
		dispatch: messagePubSub.publish,
	}
})

const updateActiveSubscriptions = <K, M, R>(
	subscriptions: HashMap.HashMap<K, Stream.Stream<M, never, R>>,
) =>
	SynchronizedRef.modifyEffect(
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

export const emptySubscription = HashMap.empty()

export type Subscriptions<M, R, K = unknown> = HashMap.HashMap<
	K,
	Stream.Stream<M, never, R>
>

const _withSubscriptions = Effect.fn(function* <S, M, R, K = unknown>({
	makeStateManager,
	evaluateSubscriptions: computeSubscriptions,
	fatalMessage: _fatalMessage,
}: {
	makeStateManager: Effect.Effect<StateManager<S, M, R>, never, Scope.Scope>
	evaluateSubscriptions: (state: S) => Subscriptions<M, R, K>
	fatalMessage?: (err: unknown) => NoInfer<M>
}): Effect.fn.Return<StateManager<S, M, R>, never, Scope.Scope> {
	const stateManager = yield* makeStateManager
	const maybeFatalMessage = Option.fromNullable(_fatalMessage)

	const isStartedRef = yield* Ref.make(false)

	const scope = yield* Scope.Scope
	const activeSubscriptionsRef = yield* SynchronizedRef.make(
		HashMap.empty<K, Deferred.Deferred<void>>(),
	)

	const start = pipe(
		Ref.getAndSet(isStartedRef, true),
		Effect.andThen(
			Effect.fn(function* (isStarted) {
				if (isStarted) {
					yield* Effect.logWarning('State manager already started')
					return Stream.empty
				}

				yield* Effect.logDebug('Starting subscriptions')
				return stateManager.stateChanges
			}),
		),
		Stream.unwrap,
		Stream.onStart(
			Effect.gen(function* () {
				yield* Effect.logDebug('Subscriptions started')
				yield* stateManager.start
			}),
		),
		Stream.changesWith((s1, s2) => s1 === s2),
		Stream.map(computeSubscriptions),
		Stream.changesWith((x, y) => x === y),
		Stream.mapEffect(subscriptions =>
			updateActiveSubscriptions(subscriptions)(activeSubscriptionsRef),
		),
		Stream.flattenChunks,
		Stream.flatMap(
			Stream.catchAllCause(err =>
				Option.match(maybeFatalMessage, {
					onNone: () => Stream.empty,
					onSome: fatalMessage => Stream.make(fatalMessage(err)),
				}),
			),
			{ concurrency: 'unbounded' },
		),
		Stream.runForEach(stateManager.dispatch),
		Effect.forkScoped,
		Scope.extend(scope),
	)

	return {
		...stateManager,
		start,
	}
})

export const withSubscriptions = Function.dual<
	<S, M, R, K>(
		p: (state: S) => Subscriptions<M, R, K>,
		options?: { fatalMessage: (err: unknown) => NoInfer<M> },
	) => (
		s: Effect.Effect<StateManager<S, M, R>, never, Scope.Scope>,
	) => Effect.Effect<StateManager<S, M, R>, never, Scope.Scope>,
	<S, M, R, K>(
		s: Effect.Effect<StateManager<S, M, R>, never, Scope.Scope>,
		p: (state: S) => Subscriptions<M, R, K>,
		options?: { fatalMessage: (err: unknown) => NoInfer<M> },
	) => Effect.Effect<StateManager<S, M, R>, never, Scope.Scope>
>(
	args => Effect.isEffect(args[0]),
	(makeStateManager, evaluateSubscriptions, options) =>
		_withSubscriptions({
			makeStateManager,
			evaluateSubscriptions,
			...(options?.fatalMessage ? { fatalMessage: options.fatalMessage } : {}),
		}),
)
