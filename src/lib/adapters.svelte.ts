import { type BackButtonListenerEvent, App as CAP } from '@capacitor/app'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'
import { onMount } from 'svelte'

import type { ViewModel } from '../core/state-manager.ts'
import type { Executor } from './executor.ts'

export function createCapacitorListener(event: `resume`): Stream.Stream<void>
export function createCapacitorListener(
	event: `backButton`,
): Stream.Stream<BackButtonListenerEvent>
export function createCapacitorListener<E extends `resume` | `backButton`>(
	event: E,
) {
	return Stream.asyncPush<unknown>(emit =>
		Effect.acquireRelease(
			Effect.promise(() =>
				event === `resume`
					? CAP.addListener(event, () => emit.single(undefined))
					: CAP.addListener(event, e => emit.single(e)),
			),
			handle => Effect.promise(() => handle.remove()),
		),
	)
}

export const useViewmodel = <S, M, R>(
	executor: Executor<R>,
	makeViewModel: Effect.Effect<ViewModel<S, M, R>>,
): { state: S | undefined; dispatch: ((m: M) => void) | undefined } => {
	let reactiveState = $state<S>()

	let viewModel = $state.raw<Effect.Effect.Success<typeof makeViewModel>>()
	let handle =
		$state.raw<
			Effect.Effect.Success<
				Effect.Effect.Success<typeof makeViewModel>[`listen`]
			>
		>()

	$effect(() => {
		if (!viewModel) return

		const cancelChanges = executor.runCallback(
			Stream.runForEach(viewModel.changes, s =>
				Effect.sync(() => {
					reactiveState = s
				}),
			),
		)

		const cancelListen = executor.runCallback(
			viewModel.listen,
			stateManager => {
				handle = stateManager
			},
		)

		return () => {
			cancelChanges()
			cancelListen()
			if (handle) {
				executor.runCallback(handle.dispose)
			}
		}
	})

	onMount(() => {
		const cancelInit = executor.runCallback(makeViewModel, vm => {
			viewModel = vm
		})

		return () => {
			cancelInit()
		}
	})

	return $derived.by(() => {
		if (!handle?.dispatch) return { state: reactiveState, dispatch: undefined }

		const dispatch = handle.dispatch

		return {
			dispatch: (m: M) => executor.runCallback(dispatch(m)),
			state: reactiveState,
		}
	})
}
