import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import * as FiberId from 'effect/FiberId'
import { pipe } from 'effect/Function'
import * as Function from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Option from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Ref from 'effect/Ref'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import { type Draft, createDraft, finishDraft } from 'immer'

type Operation<S, M, R> = Data.TaggedEnum<{
	cancel: { id: FiberId.FiberId }
	command: { effect: Effect.Effect<M, never, R> }
	subscription: {
		init?: (id: FiberId.FiberId, state: S) => M
		stream: (state: Effect.Effect<S>) => Stream.Stream<M, never, R>
	}
}>

export const Operation = <S, M, R>() => Data.taggedEnum<Operation<S, M, R>>()

export type Update<S, M, R> = (message: M) => (state: S) => {
	state: S
	operations: Operation<S, M, R>[]
}

export type StateManager<S, M> = {
	initState: S
	changes: Stream.Stream<S>
	dispatch: (m: M) => Effect.Effect<void>
	dispose: Effect.Effect<void>
}

export const makeStateManager = Effect.fn(function* <
	S,
	M extends { _tag: string | symbol },
	R,
>({
	initState,
	update,
	fatalMessage,
}: {
	initState: S
	update: Update<S, M, R>
	fatalMessage?: (err: unknown) => NoInfer<M>
}): Effect.fn.Return<StateManager<S, M>, never, R | Scope.Scope> {
	const ref = yield* SubscriptionRef.make(initState)
	const queue = yield* Queue.unbounded<M>()

	const subscriptions = yield* SynchronizedRef.make(
		HashMap.empty<FiberId.FiberId, Fiber.RuntimeFiber<void>>(),
	)

	yield* Effect.addFinalizer(
		Effect.fn(function* (exit) {
			if (Exit.isFailure(exit)) {
				yield* queue.shutdown
				yield* Effect.logDebug(`StateManager: Queue shut down`)
			}
		}),
	)

	const Op = Operation<S, M, R>()

	const updatesFiber = yield* pipe(
		Effect.gen(function* () {
			const message = yield* queue.take

			yield* Effect.annotateLogs(
				Effect.logDebug(
					`StateManager: Dispatched message "${String(message._tag)}"`,
				),
				{ message },
			)

			const transition = update(message)

			const operations = yield* SubscriptionRef.modify(ref, s => {
				const { state, operations } = transition(s)
				return [operations, state]
			})

			for (const operation of operations) {
				yield* Op.$match(operation, {
					cancel: Effect.fn(function* ({ id }) {
						yield* SynchronizedRef.updateEffect(
							subscriptions,
							Effect.fn(function* (hm) {
								const maybeFiber = HashMap.get(hm, id)

								if (Option.isNone(maybeFiber)) {
									return hm
								}

								yield* Fiber.interrupt(maybeFiber.value)

								return HashMap.remove(hm, id)
							}),
						)
					}),
					command: Effect.fn(
						function* ({ effect }) {
							const message = yield* effect
							yield* queue.offer(message)
						},
						Effect.catchAllDefect(
							Effect.fn(function* (err) {
								yield* Effect.logFatal(err)
								if (fatalMessage) {
									yield* queue.offer(fatalMessage(err))
								}
							}),
						),
						Effect.fork,
					),
					subscription: Effect.fn(function* ({ stream, init }) {
						const deferred = yield* Deferred.make()

						const fiber = yield* pipe(
							stream(ref.get),
							Stream.onStart(Deferred.await(deferred)),
							Stream.catchAllCause(err =>
								fatalMessage
									? Stream.fromEffect(
											Effect.gen(function* () {
												yield* Effect.logFatal(err)
												return fatalMessage(err)
											}),
										)
									: Stream.empty,
							),
							Stream.runForEach(m => queue.offer(m)),
							Effect.fork,
						)

						const fiberId = Fiber.id(fiber)

						if (init) {
							yield* Ref.update(subscriptions, HashMap.set(fiberId, fiber))
							const currentState = yield* ref.get
							yield* queue.offer(init(fiberId, currentState))
						}

						yield* Deferred.succeed(deferred, undefined)

						yield* fiber.await

						yield* Ref.update(subscriptions, HashMap.remove(fiberId))
					}, Effect.fork),
				})
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
			yield* Effect.all([queue.shutdown, Fiber.interrupt(updatesFiber)])
			yield* Effect.logDebug(`StateManager: Resources freed`)
		}),
		dispatch: Effect.fn(function* (m: M) {
			yield* queue.offer(m)
		}),
	}
}, Effect.scoped)

export const modify = Function.dual<
	<S extends object, M, R>(
		p: (draft: Draft<S>) => Arr.NonEmptyArray<Operation<S, M, R>> | void,
	) => (state: S) => {
		state: S
		operations: Operation<S, M, R>[]
	},
	<S extends object, M, R>(
		state: S,
		p: (draft: Draft<S>) => Arr.NonEmptyArray<Operation<S, M, R>> | void,
	) => {
		state: S
		operations: Operation<S, M, R>[]
	}
>(2, (state, p) => {
	const draft = createDraft(state)

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	const operations = p(draft) ?? []

	return {
		state: finishDraft(draft) as typeof state,
		operations,
	}
})

type NoOpType = {
	<S, M, R>(state: S): { state: S; operations: Operation<S, M, R>[] }
	func<M, R>(): <S>(state: S) => {
		state: S
		operations: Operation<S, M, R>[]
	}
}

export const noOp: NoOpType = Object.assign(
	<S>(state: S) => ({
		state,
		operations: [],
	}),
	{
		func:
			() =>
			<S>(state: S) => ({
				state,
				operations: [],
			}),
	},
)

export const operations = Function.dual<
	<S, M, R>(
		operations: Arr.NonEmptyArray<Operation<S, M, R>>,
	) => (state: S) => {
		state: S
		operations: Operation<S, M, R>[]
	},
	<S, M, R>(
		state: S,
		operations: Arr.NonEmptyArray<Operation<S, M, R>>,
	) => {
		state: S
		operations: Operation<S, M, R>[]
	}
>(2, (state, operations) => {
	return {
		state,
		operations,
	}
})
