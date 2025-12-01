import * as Brand from 'effect/Brand'
import * as Chunk from 'effect/Chunk'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as PubSub from 'effect/PubSub'
import * as Queue from 'effect/Queue'
import * as Ref from 'effect/Ref'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'

export type Command<M, R> = Effect.Effect<M, never, R>

export type Update<S, M, R> = (message: M) => (state: S) => {
	state: S
	commands: Chunk.Chunk<Command<M, R>>
}

export type StateManager<S, M, R> = {
	initState: S
	stateChanges: Stream.Stream<S>
	messages: Stream.Stream<M>
	run: Effect.Effect<
		{
			dispatch: (m: M) => Effect.Effect<void>
			dispose: Effect.Effect<void>
		},
		never,
		R
	>
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
}: {
	initState: S
	initMessages?: [M, ...M[]]
	subscriptions?: Subscriptions<S, M, R>
	update: Update<S, M, R>
	fatalMessage?: (err: unknown) => NoInfer<M>
}): Effect.fn.Return<StateManager<S, M, R>> {
	const stateRef = yield* SubscriptionRef.make(initState)
	const messagePubSub = yield* PubSub.unbounded<M>()
	const initializedRef = yield* Ref.make(false)
	const isShutdown = yield* Deferred.make<undefined>()

	return {
		initState,
		stateChanges: pipe(
			stateRef.changes,
			Stream.onEnd(Effect.logDebug(`StateManager: Stream of changes ended`)),
			Stream.interruptWhenDeferred(isShutdown),
		),
		messages: Stream.onEnd(
			Stream.fromPubSub(messagePubSub),
			Effect.logDebug(`StateManager: Stream of messages ended`),
		),
		run: Effect.scoped(
			Effect.gen(function* () {
				if (yield* Ref.getAndSet(initializedRef, true)) {
					return yield* Effect.dieMessage('State manager was already started')
				}

				const queue = yield* Queue.unbounded<M>()

				if (initMessages) {
					yield* Queue.offerAll(queue, initMessages)
				}

				const maybeSubscriptionsFiber = yield* Effect.gen(function* () {
					const maybeSubscriptions = Option.fromNullable(_subscriptions)

					if (Option.isNone(maybeSubscriptions)) {
						return Option.none<Fiber.RuntimeFiber<void>>()
					}

					const subscriptions = [...maybeSubscriptions.value]
					const fiber = yield* pipe(
						Stream.fromIterable(subscriptions),
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
								Stream.flatMap(s => s.stream, {
									switch: true,
								}),
							),
						),
						Stream.runCollect,
						Stream.flatMap(Stream.mergeAll({ concurrency: 'unbounded' })),
						Stream.runForEach(m => queue.offer(m)),
						Effect.forkDaemon,
					)

					yield* Effect.addFinalizer(
						Effect.fn(function* (exit) {
							if (Exit.isFailure(exit)) {
								yield* Fiber.interrupt(fiber)
								yield* Effect.logDebug(`StateManager: Subscriptions shut down`)
							}
						}),
					)

					return Option.some(fiber)
				})

				const updatesFiber = yield* Effect.gen(function* () {
					const fiber = yield* pipe(
						Effect.gen(function* () {
							const message = yield* queue.take

							yield* Effect.annotateLogs(
								Effect.logDebug(
									`StateManager: Dispatched message "${String(message._tag)}"`,
								),
								{ message },
							)

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
						Effect.forkDaemon,
					)

					yield* Effect.addFinalizer(
						Effect.fn(function* (exit) {
							if (Exit.isFailure(exit)) {
								yield* Fiber.interrupt(fiber)
								yield* Effect.logDebug(`StateManager: Reducer interrupted`)
							}
						}),
					)

					return fiber
				})

				return {
					dispose: Effect.gen(function* () {
						yield* Effect.all([
							queue.shutdown,
							messagePubSub.shutdown,
							Deferred.succeed(isShutdown, undefined),
							Fiber.interrupt(updatesFiber),
							Option.match(maybeSubscriptionsFiber, {
								onSome: fiber => Fiber.interrupt(fiber),
								onNone: () => Effect.void,
							}),
						])
						yield* Effect.logDebug(`StateManager: Resources freed`)
					}),
					dispatch: Effect.fn(function* (m: M) {
						yield* queue.offer(m)
					}),
				}
			}),
		),
	}
})
