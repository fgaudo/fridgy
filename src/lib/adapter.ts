import * as A from '@effect/atom-react'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'
import * as AsyncResult from 'effect/unstable/reactivity/AsyncResult'
import * as Atom from 'effect/unstable/reactivity/Atom'

import * as StateManager from '@/core/state-manager.ts'

export const useStateManager = <S, M, R>(
	runtime: Atom.AtomRuntime<R>,
	makeStateManager: Effect.Effect<
		StateManager.StateManager<S, M, R>,
		never,
		Scope.Scope
	>,
	messages: (m: M) => void,
) => {
	const [stateResult, setState] = A.useAtom(
		Atom.make<AsyncResult.AsyncResult<S>>(AsyncResult.initial()),
	)

	const dispatch = A.useAtomSet(
		runtime.fn(
			({
				m,
				stateManager,
			}: {
				m: M
				stateManager: StateManager.StateManager<S, M, R>
			}) => StateManager.dispatch(stateManager, m),
		),
	)

	const dispatchResult = A.useAtomValue(
		runtime.atom(
			Effect.gen(function* () {
				const stateManager = yield* makeStateManager
				const ready1 = yield* Deferred.make()
				const ready2 = yield* Deferred.make()
				const scope = yield* Scope.Scope

				yield* StateManager.stateChanges(stateManager).pipe(
					Stream.onStart(Deferred.succeed(ready1, undefined)),
					Stream.runForEach(
						Effect.fn(function* (state) {
							yield* Effect.sync(() => setState(AsyncResult.success(state)))
						}),
					),
					Effect.forkIn(scope),
				)

				yield* StateManager.messages(stateManager).pipe(
					Stream.onStart(Deferred.succeed(ready2, undefined)),

					Stream.runForEach(
						Effect.fn(function* (message) {
							yield* Effect.sync(() => messages(message))
						}),
					),
					Effect.forkIn(scope),
				)

				yield* Deferred.await(ready1)
				yield* Deferred.await(ready2)
				yield* StateManager.start(stateManager)

				return (m: M) => dispatch({ stateManager, m })
			}),
		),
	)

	return AsyncResult.all([stateResult, dispatchResult])
}
