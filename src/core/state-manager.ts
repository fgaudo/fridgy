import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import { flow, pipe } from 'effect/Function'
import * as List from 'effect/List'
import * as Option from 'effect/Option'
import * as PubSub from 'effect/PubSub'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'

export type Command<M, R> = Effect.Effect<M, never, R>

export type Update<S, M, R> = (message: M) => (state: S) => {
	state: S
	commands: List.List<Command<M, R>>
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

export type Subscription<S, M, R> = {
	selector: (s: S) => unknown
	create: (s: S) => Stream.Stream<M, never, R>
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

	return {
		initState,
		stateChanges: Stream.onEnd(
			stateRef.changes,
			Effect.logDebug(`StateManager: Stream of changes ended`),
		),
		messages: Stream.onEnd(
			Stream.fromPubSub(messagePubSub),
			Effect.logDebug(`StateManager: Stream of messages ended`),
		),
		run: Effect.scoped(
			Effect.gen(function* () {
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
						stateRef.changes,
						Stream.broadcast(Arr.length(subscriptions), {
							capacity: 'unbounded',
						}),
						Stream.map(
							Arr.zipWith(subscriptions, (changes, { create, selector }) => ({
								create,
								changes,
								selector,
							})),
						),
						Stream.flatMap(
							flow(
								Arr.map(({ changes, selector, create }) =>
									pipe(
										changes,
										Stream.bindTo('state'),
										Stream.bindEffect('result', ({ state }) =>
											Effect.sync(() => selector(state)),
										),
										Stream.changesWith(
											({ result: result1 }, { result: result2 }) =>
												Equal.equals(result1, result2),
										),
										Stream.map(({ state }) => state),
										Stream.flatMap(create, {
											switch: true,
										}),
									),
								),
								Stream.mergeAll({ concurrency: 'unbounded' }),
							),
						),
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
					const f = yield* pipe(
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
								yield* Fiber.interrupt(f)
								yield* Effect.logDebug(`StateManager: Reducer interrupted`)
							}
						}),
					)

					return f
				})

				return {
					dispose: Effect.gen(function* () {
						yield* Effect.all([
							queue.shutdown,
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
