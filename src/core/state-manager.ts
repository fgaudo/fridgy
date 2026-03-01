import * as Chunk from 'effect/Chunk'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Function from 'effect/Function'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Option from 'effect/Option'
import * as PubSub from 'effect/PubSub'
import * as Queue from 'effect/Queue'
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

export const makeStateManager = Effect.fn(function* <S, M, R>(
	initState: S,
	update: Update<S, M, R>,
	options?: { fatalMessage?: (err: unknown) => NoInfer<M> },
): Effect.fn.Return<StateManager<S, M, R>, never, Scope.Scope> {
	const maybeFatalMessage = pipe(
		Option.fromUndefinedOr(options),
		Option.flatMap(opt => Option.fromUndefinedOr(opt.fatalMessage)),
	)

	const stateRef = yield* SubscriptionRef.make(initState)
	const messageQueue = yield* Effect.acquireRelease(
		Queue.unbounded<M>(),
		Queue.shutdown,
	)

	const messagePubSub = yield* Effect.acquireRelease(
		PubSub.unbounded<M>(),
		pubSub => PubSub.shutdown(pubSub),
	)

	const scope = yield* Effect.scope
	const isStartedRef = yield* Ref.make(false)
	const start = pipe(
		Ref.getAndSet(isStartedRef, true),
		Effect.tap(isStarted =>
			isStarted
				? Effect.logWarning('State manager already started')
				: Effect.logDebug('Starting state manager'),
		),
		Stream.fromEffect,
		Stream.filter(isStarted => !isStarted),
		Stream.flatMap(() =>
			Stream.fromQueue(messageQueue).pipe(
				Stream.onStart(Effect.logDebug('State manager started')),
			),
		),
		Stream.map(update),
		Stream.mapEffect(transition =>
			SubscriptionRef.modify(stateRef, s => {
				const { state, commands } = transition(s)

				return [commands, state]
			}),
		),
		Stream.flattenIterable,
		Stream.flattenEffect({ concurrency: 'unbounded', unordered: true }),
		Stream.catchCause(err =>
			Option.match(maybeFatalMessage, {
				onNone: () => Stream.empty,
				onSome: fatalMessage => Stream.make(fatalMessage(err)),
			}),
		),
		Stream.runForEach(m =>
			Effect.all([
				Queue.offer(messageQueue, m),
				PubSub.publish(messagePubSub, m),
			]),
		),
		Effect.forkScoped,
		Effect.asVoid,
		Scope.provide(scope),
	)
	const stateChanges = yield* pipe(
		Effect.acquireRelease(
			Effect.gen(function* () {
				const interruption = yield* Deferred.make<undefined>()

				return {
					stream: pipe(
						SubscriptionRef.changes(stateRef),
						Stream.changesWith((s1, s2) => s1 === s2),
						Stream.interruptWhen(Deferred.await(interruption)),
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
		messages: Stream.fromPubSub(messagePubSub),
		dispatch: (m: M) => Queue.offer(messageQueue, m),
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
					Stream.interruptWhen(stream, Deferred.await(interruption)),
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
	evaluateSubscriptions,
	fatalMessage: _fatalMessage,
}: {
	makeStateManager: Effect.Effect<StateManager<S, M, R>, never, Scope.Scope>
	evaluateSubscriptions: (state: S) => Subscriptions<M, R, K>
	fatalMessage?: (err: unknown) => NoInfer<M>
}): Effect.fn.Return<StateManager<S, M, R>, never, Scope.Scope> {
	const stateManager = yield* makeStateManager
	const maybeFatalMessage = Option.fromUndefinedOr(_fatalMessage)

	const isStartedRef = yield* Ref.make(false)

	const scope = yield* Effect.scope
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
				return stateManager.stateChanges.pipe(
					Stream.onStart(
						Effect.gen(function* () {
							yield* Effect.logDebug('Subscriptions started')
							yield* stateManager.start
						}),
					),
				)
			}),
		),
		Stream.unwrap,
		Stream.changesWith((s1, s2) => s1 === s2),
		Stream.map(evaluateSubscriptions),
		Stream.changesWith((x, y) => x === y),
		Stream.mapEffect(subscriptions =>
			updateActiveSubscriptions(subscriptions)(activeSubscriptionsRef),
		),
		Stream.flattenIterable,
		Stream.flatMap(
			Stream.catchCause(err =>
				Option.match(maybeFatalMessage, {
					onNone: () => Stream.empty,
					onSome: fatalMessage => Stream.make(fatalMessage(err)),
				}),
			),
			{ concurrency: 'unbounded' },
		),
		Stream.runForEach(stateManager.dispatch),
		Effect.forkScoped,
		Scope.provide(scope),
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
			...(options?.fatalMessage !== undefined
				? { fatalMessage: options.fatalMessage }
				: {}),
		}),
)
