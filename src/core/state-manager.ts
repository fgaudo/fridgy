import * as Brand from 'effect/Brand'
import * as Chunk from 'effect/Chunk'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Fiber from 'effect/Fiber'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as PubSub from 'effect/PubSub'
import * as Queue from 'effect/Queue'
import * as Schedule from 'effect/Schedule'
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
	dispose: Effect.Effect<void>
}

export const keyedEmptyStream = { key: Symbol(), stream: Stream.empty }

const previous: unique symbol = Symbol('Previous')
const current: unique symbol = Symbol('Current')

type Previous<T> = Brand.Branded<T, typeof previous>
type Current<T> = Brand.Branded<T, typeof current>

type KeyedStream<M, R> = {
	key: unknown
	stream: Stream.Stream<M, never, R>
}

export type Subscription<S, M, R> = {
	init: (s: S) => KeyedStream<M, R>
	update: (p: {
		current: Current<S>
		previous: Previous<S>
		active: KeyedStream<M, R>
	}) => KeyedStream<M, R>
}

export type Subscriptions<S, M, R> = [
	Subscription<S, M, R>,
	...Subscription<S, M, R>[],
]

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
	initMessages?: [M, ...M[]]
	subscriptions?: Subscriptions<S, M, R>
	update: Update<S, M, R>
	fatalMessage?: (err: unknown) => NoInfer<M>
	fatalMessageSubscription?: (err: unknown) => NoInfer<M>
}): Effect.fn.Return<StateManager<S, M, R>> {
	const stateRef = yield* SubscriptionRef.make(initState)
	const messagePubSub = yield* PubSub.unbounded<M>()
	const managerStateRef = yield* SynchronizedRef.make<
		| {
				isInitialized: true
				maybeSubscriptionsFiber: Option.Option<Fiber.RuntimeFiber<void>>
				updatesFiber: Fiber.RuntimeFiber<void>
				isDisposed: boolean
		  }
		| { isInitialized: false; isDisposed: boolean }
	>({ isInitialized: false, isDisposed: false })

	const isShutdown = yield* Deferred.make<undefined>()
	const queue = yield* Queue.unbounded<M>()

	const updateLoop = pipe(
		Effect.gen(function* () {
			const message = yield* queue.take

			const transition = update(message)

			const commands = yield* SubscriptionRef.modify(stateRef, s => {
				const { state, commands } = transition(s)
				return [commands, state]
			})

			yield* PubSub.publish(messagePubSub, message)

			for (const command of commands) {
				yield* pipe(
					Effect.gen(function* () {
						const message = yield* command
						yield* queue.offer(message)
					}),
					Effect.catchAllDefect(
						Effect.fn(function* (err) {
							yield* Effect.logFatal(err)
							if (fatalMessage) {
								yield* queue.offer(fatalMessage(err))
							}
						}),
					),
					Effect.fork,
				)
			}
		}),
		Effect.catchAllDefect(
			Effect.fn(function* (err) {
				yield* Effect.logFatal(err)
				if (fatalMessage) {
					yield* queue.offer(fatalMessage(err))
				}
			}),
		),
		Effect.forever,
	)

	const maybeSubscriptionsLoop = Option.gen(function* () {
		const subscriptions = yield* Option.fromNullable(_subscriptions)

		const effect = pipe(
			Stream.fromIterable([...subscriptions]),
			Stream.map(subscription =>
				pipe(
					stateRef.changes,
					Stream.changesWith((s1, s2) => s1 === s2),
					Stream.mapAccum(
						Option.none<{
							state: S
							stream: {
								key: unknown
								stream: Stream.Stream<M, never, R>
							}
						}>(),
						(maybePrev, currentState) => {
							const newStream = Option.match(maybePrev, {
								onNone: () => subscription.init(currentState),
								onSome: previous =>
									subscription.update({
										// oxlint-disable-next-line no-unsafe-type-assertion
										current: currentState as Current<S>,
										// oxlint-disable-next-line no-unsafe-type-assertion
										previous: previous.state as Previous<S>,
										active: previous.stream,
									}),
							})

							const nextPrev = Option.some({
								state: currentState,
								stream: newStream,
							})
							return [nextPrev, newStream]
						},
					),
					Stream.changesWith(({ key: k1 }, { key: k2 }) =>
						Equal.equals(k1, k2),
					),

					Stream.flatMap(
						keyed =>
							pipe(
								keyed.stream,
								Stream.catchAllCause(err =>
									fatalMessageSubscription
										? Stream.concat(
												Stream.make(fatalMessageSubscription(err)),
												Stream.fail(err),
											)
										: Stream.fail(err),
								),
								Stream.retry(Schedule.spaced('2 seconds')),
								Stream.catchAll(() => Stream.empty),
							),
						{
							switch: true,
						},
					),
				),
			),
			Stream.runCollect,
			Stream.flatMap(Stream.mergeAll({ concurrency: 'unbounded' })),
			Stream.runForEach(m => queue.offer(m)),
		)

		return effect
	})

	return {
		stateChanges: pipe(
			stateRef.changes,
			Stream.changesWith((s1, s2) => s1 === s2),
			Stream.interruptWhenDeferred(isShutdown),
		),
		messages: Stream.fromPubSub(messagePubSub),
		start: pipe(
			managerStateRef,
			SynchronizedRef.updateEffect(
				Effect.fn(function* (managerState) {
					if (managerState.isDisposed) {
						yield* Effect.logWarning('State manager is disposed.')
						return managerState
					}

					if (managerState.isInitialized) {
						yield* Effect.logWarning('State manager is already initialized.')
						return managerState
					}

					if (initMessages) {
						yield* Queue.offerAll(queue, initMessages)
					}

					const maybeSubscriptionsFiber = yield* Effect.gen(function* () {
						if (Option.isNone(maybeSubscriptionsLoop)) {
							return Option.none()
						}

						const fiber = yield* Effect.forkDaemon(maybeSubscriptionsLoop.value)

						return Option.some(fiber)
					})

					const updatesFiber = yield* Effect.forkDaemon(updateLoop)

					return {
						...managerState,
						isInitialized: true,
						updatesFiber,
						maybeSubscriptionsFiber,
					}
				}),
			),
			Effect.uninterruptible,
		),

		dispose: pipe(
			managerStateRef,
			SynchronizedRef.updateEffect(
				Effect.fn(function* (managerState) {
					if (managerState.isDisposed) {
						return managerState
					}

					if (managerState.isInitialized) {
						yield* Effect.all([
							queue.shutdown,
							messagePubSub.shutdown,
							Deferred.succeed(isShutdown, undefined),
							Fiber.interrupt(managerState.updatesFiber),
							Option.match(managerState.maybeSubscriptionsFiber, {
								onSome: fiber => Fiber.interrupt(fiber),
								onNone: () => Effect.void,
							}),
						])
					}

					return { ...managerState, isDisposed: true }
				}),
			),
			Effect.uninterruptible,
		),
		dispatch: Effect.fn(function* (m: M) {
			yield* queue.offer(m)
		}),
	}
})
