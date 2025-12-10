import * as Effect from 'effect/Effect'
import * as ExecutionStrategy from 'effect/ExecutionStrategy'
import * as Exit from 'effect/Exit'
import { pipe } from 'effect/Function'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'
import { useEffect, useState } from 'react'

import { type ViewModel } from '../core/viewmodel'

export const useViewmodel = <S, M, R>({
	runtime,
	initState,
	makeViewModel,
	messages,
}: {
	runtime: ManagedRuntime.ManagedRuntime<R, never>
	initState: S
	makeViewModel: Effect.Effect<ViewModel<S, M, R>, never, Scope.Scope>
	messages?: (m: M) => void
}) => {
	const [state, setState] = useState(initState)
	const [viewmodel, setViewmodel] = useState<ViewModel<S, M, R>>()

	const [messagesInitialized, setMessagesInitialized] = useState(false)
	const [stateChangesInitialized, setStateChangesInitialized] = useState(false)

	const [error, setError] = useState<Error | undefined>(undefined)

	if (error) {
		throw error
	}

	useEffect(() => {
		setViewmodel(undefined)
		setError(undefined)
		setStateChangesInitialized(false)
		setMessagesInitialized(false)

		const scope = runtime.runSync(Scope.make(ExecutionStrategy.parallel))

		const cancel = runtime.runCallback(Scope.extend(makeViewModel, scope), {
			onExit: exit => {
				if (Exit.isSuccess(exit)) {
					setViewmodel(exit.value)
				} else {
					setError(new Error('Could not initialize viewModel'))
				}
			},
		})

		return () => {
			cancel()
			runtime.runFork(Scope.close(scope, Exit.void))
		}
	}, [runtime, makeViewModel])

	useEffect(() => {
		if (!viewmodel || error) {
			return
		}

		const cancelChanges = pipe(
			viewmodel.stateChanges,
			Stream.onStart(
				Effect.sync(() => {
					setStateChangesInitialized(true)
				}),
			),
			Stream.runForEach(s =>
				Effect.sync(() => {
					setState(s)
				}),
			),
			runtime.runCallback,
		)

		return cancelChanges
	}, [viewmodel, runtime, error])

	useEffect(() => {
		if (!viewmodel || error) return

		if (!messages) {
			setMessagesInitialized(true)
			return
		}

		const cancelMessages = pipe(
			viewmodel.messages,
			Stream.onStart(
				Effect.sync(() => {
					setMessagesInitialized(true)
				}),
			),
			Stream.runForEach(m =>
				pipe(
					Effect.sync(() => messages(m)),
					Effect.catchAllDefect(e =>
						Effect.logFatal('Messages callback threw an error', e),
					),
				),
			),
			runtime.runCallback,
		)

		return cancelMessages
	}, [viewmodel, runtime, messages, error])

	useEffect(() => {
		if (
			!stateChangesInitialized ||
			!messagesInitialized ||
			!viewmodel ||
			error
		) {
			return
		}

		return runtime.runCallback(viewmodel.start)
	}, [viewmodel, stateChangesInitialized, messagesInitialized, runtime, error])

	return state
}
