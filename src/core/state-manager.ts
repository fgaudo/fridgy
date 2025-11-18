import * as Arr from 'effect/Array'
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

export type Command<M, R> = Stream.Stream<M, never, R>

export type Update<S, M, R> = (
	message: M,
) => (state: S) => { state: S; commands: Command<M, R>[] }

export type StateManager<S, M> = {
	initState: S
	changes: Stream.Stream<S>
	dispatch: (m: M) => Effect.Effect<void>
	dispatchEffect: (m: Effect.Effect<M>) => Effect.Effect<void>
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

			const commands = yield* SubscriptionRef.modify(ref, s => {
				const { state, commands } = change(s)
				return [commands, state]
			})

			for (const command of commands) {
				yield* pipe(
					command,
					Stream.mapEffect(m => queue.offer(m)),
					Stream.runDrain,
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
			yield* Effect.all([queue.shutdown, Fiber.interrupt(updatesFiber)])
			yield* Effect.logDebug(`StateManager: Resources freed`)
		}),
		dispatch: Effect.fn(function* (m: M) {
			yield* queue.offer(m)
		}),
		dispatchEffect: Effect.fn(function* (effect: Effect.Effect<M>) {
			const m = yield* effect
			yield* queue.offer(m)
		}),
	}
}, Effect.scoped)

export const modify = Function.dual<
	<S extends object, C>(
		p: (draft: Draft<S>) => Arr.NonEmptyArray<C> | void,
	) => (state: S) => {
		state: S
		commands: C[]
	},
	<S extends object, C>(
		state: S,
		p: (draft: Draft<S>) => Arr.NonEmptyArray<C> | void,
	) => { state: S; commands: C[] }
>(2, (state, p) => {
	const draft = createDraft(state)

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	const commands = p(draft) ?? []

	return {
		state: finishDraft(draft) as typeof state,
		commands,
	}
})

type NoOpType = {
	<S, C>(state: S): { state: S; commands: C[] }
	func<C>(): <S>(state: S) => {
		state: S
		commands: C[]
	}
}

export const noOp: NoOpType = Object.assign(
	<S>(state: S) => ({
		state,
		commands: [],
	}),
	{
		func:
			() =>
			<S>(state: S) => ({
				state,
				commands: [],
			}),
	},
)

export const commands = Function.dual<
	<C>(effects: Arr.NonEmptyArray<C>) => <S>(state: S) => {
		state: S
		commands: C[]
	},
	<S, C>(
		state: S,
		effects: Arr.NonEmptyArray<C>,
	) => {
		state: S
		commands: C[]
	}
>(2, (state, commands) => {
	return {
		state,
		commands,
	}
})
