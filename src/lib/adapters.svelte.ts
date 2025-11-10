import { type BackButtonListenerEvent, App as CAP } from '@capacitor/app'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'
import { onMount } from 'svelte'

import type { ViewModel } from './core.ts'
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
	viewModel: ViewModel<S, M, R>,
): { state: S; dispatch: ((m: M) => void) | undefined } => {
	let state = $state.raw<S>(viewModel.initState)

	let initializedViewModel =
		$state.raw<Effect.Effect.Success<(typeof viewModel)[`setup`]>>()
	let handle =
		$state.raw<
			Effect.Effect.Success<
				Effect.Effect.Success<(typeof viewModel)[`setup`]>[`run`]
			>
		>()

	$effect(() => {
		if (!initializedViewModel) return

		const cancelChanges = executor.runCallback(
			Stream.runForEach(initializedViewModel.changes, s =>
				Effect.sync(() => {
					state = s
				}),
			),
		)

		const cancelListen = executor.runCallback(
			initializedViewModel.run,
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
		const cancelInit = executor.runCallback(viewModel.setup, vm => {
			initializedViewModel = vm
		})

		return () => {
			cancelInit()
		}
	})

	return $derived.by(() => {
		if (!handle?.dispatch) return { state, dispatch: undefined }

		const dispatch = handle.dispatch

		return {
			dispatch: (m: M) => executor.runCallback(dispatch(m)),
			state,
		}
	})
}
