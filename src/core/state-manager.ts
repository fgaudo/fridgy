import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import { flow, pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'

export type Command<M, R> = Effect.Effect<M, never, R>

export type Update<S, M, R> = (
	message: M,
) => (state: S) => { state: S; commands: Command<M, R>[] }

export const makeStateManager = Effect.fn(function* <
	S,
	M extends { _tag: string },
	R,
>({
	initState,
	update,
	subscriptions,
	fatalMessage,
}: {
	initState: S
	update: Update<S, M, R>
	subscriptions?: (s: S) => Stream.Stream<NoInfer<M>>
	fatalMessage?: (err: unknown) => NoInfer<M>
}) {
	const ref = yield* SubscriptionRef.make(initState)

	const queue = yield* Queue.unbounded<M>()

	yield* Effect.addFinalizer(
		Effect.fn(function* (exit) {
			if (Exit.isFailure(exit)) {
				yield* queue.shutdown
				yield* Effect.logDebug(`StateManager: Queue shut down`)
			}
		}),
	)
	const maybeSubsFiber = yield* Effect.option(
		Effect.gen(function* () {
			const subs = yield* Option.fromNullable(subscriptions)
			const fiber = yield* pipe(
				Stream.changes(ref.changes),
				Stream.flatMap(
					flow(
						subs,
						Stream.mapEffect(m => queue.offer(m)),
					),
					{
						switch: true,
					},
				),
				Stream.runDrain,
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

			return fiber
		}),
	)

	const updatesFiber = yield* pipe(
		Effect.gen(function* () {
			const message = yield* queue.take

			yield* Effect.annotateLogs(
				Effect.logDebug(`StateManager: Dispatched message "${message._tag}"`),
				{ message },
			)

			const change = update(message)

			const commands = yield* SubscriptionRef.modify(ref, s => {
				const { state, commands } = change(s)
				return [commands, state]
			})

			for (const command of commands) {
				yield* pipe(
					Effect.gen(function* () {
						const m = yield* command
						yield* queue.offer(m)
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
				yield* Fiber.interrupt(updatesFiber)
				yield* Effect.logDebug(`StateManager: Reducer interrupted`)
			}
		}),
	)

	return {
		initState,
		changes: Stream.onEnd(
			ref.changes,
			Effect.logDebug(`StateManager: Stream of changes ended`),
		),
		dispose: Effect.gen(function* () {
			yield* Effect.all([
				queue.shutdown,
				Fiber.interrupt(updatesFiber),
				Option.isSome(maybeSubsFiber)
					? Fiber.interrupt(maybeSubsFiber.value)
					: Effect.void,
			])
			yield* Effect.logDebug(`StateManager: Resources freed`)
		}),
		dispatch: Effect.fn(function* (m: M) {
			yield* queue.offer(m)
		}),
	}
}, Effect.scoped)
