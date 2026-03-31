import * as A from '@effect/atom-react'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'
import * as Atom from 'effect/unstable/reactivity/Atom'

import * as StateManager from '@/core/state-manager.ts'

export const useAtomStateManager = <State, Message, R>(
	runtime: Atom.AtomRuntime<R>,
	init: StateManager.Transition<State, Message, R>,
	makeStateManager: (
		init: StateManager.Transition<State, Message, R>,
	) => Effect.Effect<
		StateManager.StateManager<State, Message, R>,
		never,
		Scope.Scope
	>,
) => {
	const [event, setEvent] = A.useAtom(
		Atom.make([init[0], Opt.none<Message>()] as const),
	)

	const dispatch = A.useAtomSet(
		runtime.fn(
			({
				m,
				stateManager,
			}: {
				m: Message
				stateManager: StateManager.StateManager<State, Message, R>
			}) => StateManager.dispatch(stateManager, m),
		),
	)

	const dispatchResult = A.useAtomValue(
		runtime.atom(
			Effect.gen(function* () {
				const stateManager = yield* makeStateManager(init)
				const ready1 = yield* Deferred.make()

				yield* StateManager.stateChanges(stateManager).pipe(
					Stream.onStart(Deferred.succeed(ready1, undefined)),
					Stream.drop(1),
					Stream.runForEach(
						Effect.fnUntraced(function* (event) {
							yield* Effect.sync(() => {
								setEvent(event)
							})
						}),
					),
					Effect.forkScoped,
				)

				yield* Deferred.await(ready1)
				yield* StateManager.start(stateManager)

				return (m: Message) => {
					dispatch({ stateManager, m })
				}
			}),
		),
	)

	return [[event[0], event[1]] as const, dispatchResult] as const
}
