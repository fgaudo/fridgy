import * as Cause from 'effect/Cause'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { pipe } from 'effect/Function'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'
import { useEffect, useState } from 'react'

import type { StateManager } from '@/core/state-manager.ts'

import { type ViewModel } from '@/core/viewmodel.ts'

export const useViewmodel = <S, M, R>({
	runtime,
	viewModel,
	messageHandler,
}: {
	runtime: ManagedRuntime.ManagedRuntime<R, never>
	viewModel: ViewModel<S, M, R>
	messageHandler?: (m: M) => void
}) => {
	const [state, setState] = useState(viewModel.init)
	const [stateManager, setStateManager] = useState<
		StateManager<S, M, R> | undefined
	>(undefined)

	const [error, setError] = useState<Error | undefined>(undefined)

	if (error !== undefined) {
		throw error
	}

	useEffect(() => {
		const scope = Scope.makeUnsafe('parallel')

		const cancel = runtime.runCallback(
			Scope.provide(
				Effect.gen(function* () {
					const stateManager = yield* viewModel.make

					yield* Effect.sync(() => {
						setStateManager(stateManager)
					})

					const messagesReady = yield* Deferred.make<undefined>()
					const statesReady = yield* Deferred.make<undefined>()

					yield* pipe(
						stateManager.stateChanges,
						Stream.onStart(Deferred.succeed(statesReady, undefined)),
						Stream.runForEach(state =>
							Effect.sync(() => {
								setState(state)
							}),
						),
						Effect.forkScoped,
					)

					if (messageHandler === undefined) {
						yield* Deferred.succeed(messagesReady, undefined)
					} else {
						yield* pipe(
							stateManager.messages,
							Stream.onStart(Deferred.succeed(messagesReady, undefined)),
							Stream.runForEach(message =>
								pipe(
									Effect.sync(() => {
										messageHandler(message)
									}),
									Effect.catchDefect(e =>
										Effect.logFatal('Messages callback threw an error', e),
									),
								),
							),
							Effect.forkScoped,
						)
					}

					yield* Effect.all([
						Deferred.await(statesReady),
						Deferred.await(messagesReady),
					])

					yield* stateManager.start
				}),
				scope,
			),
			{
				onExit: exit => {
					if (Exit.isFailure(exit) && Cause.hasDies(exit.cause)) {
						runtime.runFork(Scope.close(scope, Exit.void))
						setError(new Error(exit.cause.toString()))
					}
				},
			},
		)

		return () => {
			cancel()
			runtime.runFork(Scope.close(scope, Exit.void))
		}
	}, [runtime, viewModel, messageHandler])

	return { state, dispatch: stateManager?.dispatch }
}
