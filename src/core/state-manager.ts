import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import { pipe } from 'effect/Function'
import * as Function from 'effect/Function'
import * as Queue from 'effect/Queue'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import { type Draft, createDraft, finishDraft } from 'immer'

type Operation<M, R> = Data.TaggedEnum<{
	command: { effect: Effect.Effect<M, never, R> }
	subscription: {
		init?: (fiber: Fiber.RuntimeFiber<void>) => M
		stream: Stream.Stream<M, never, R>
	}
}>

export const Operation = <M, R>() => Data.taggedEnum<Operation<M, R>>()

export type Update<S, M, R> = (message: M) => (state: S) => {
	state: S
	operations: Operation<M, R>[]
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

	yield* Effect.addFinalizer(
		Effect.fn(function* (exit) {
			if (Exit.isFailure(exit)) {
				yield* queue.shutdown
				yield* Effect.logDebug(`StateManager: Queue shut down`)
			}
		}),
	)

	const Op = Operation<M, R>()

	const updatesFiber = yield* pipe(
		Effect.gen(function* () {
			const message = yield* queue.take

			yield* Effect.annotateLogs(
				Effect.logDebug(
					`StateManager: Dispatched message "${String(message._tag)}"`,
				),
				{ message },
			)

			const change = update(message)

			const operations = yield* SubscriptionRef.modify(ref, s => {
				const { state, operations } = change(s)
				return [operations, state]
			})

			for (const operation of operations) {
				yield* Op.$match(operation, {
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
							stream,
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

						if (init) {
							yield* queue.offer(init(fiber))
						}

						yield* Deferred.succeed(deferred, undefined)
					}),
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
	<S extends object, O>(
		p: (draft: Draft<S>) => Arr.NonEmptyArray<O> | void,
	) => (state: S) => {
		state: S
		operations: O[]
	},
	<S extends object, O>(
		state: S,
		p: (draft: Draft<S>) => Arr.NonEmptyArray<O> | void,
	) => {
		state: S
		operations: O[]
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
	<S, O>(state: S): { state: S; operations: O[] }
	func<O>(): <S>(state: S) => {
		state: S
		operations: O[]
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
	<O>(operations: Arr.NonEmptyArray<O>) => <S>(state: S) => {
		state: S
		operations: O[]
	},
	<S, O>(
		state: S,
		operations: Arr.NonEmptyArray<O>,
	) => {
		state: S
		operations: O[]
	}
>(2, (state, operations) => {
	return {
		state,
		operations,
	}
})
