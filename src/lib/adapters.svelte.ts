import { type BackButtonListenerEvent, App as CAP } from '@capacitor/app'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'
import { onDestroy, onMount } from 'svelte'

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
): { state: S; dispatch: (m: M) => void } | undefined => {
	let state = $state.raw<S>()

	let handle = $state.raw<Effect.Effect.Success<typeof viewModel>>()
	let initialized = false

	$effect(() => {
		if (!handle) return

		const cancelChanges = executor.runCallback(
			Stream.runForEach(handle.changes, s =>
				Effect.sync(() => {
					state = s
				}),
			),
		)

		initialized = true

		return () => {
			cancelChanges()
		}
	})

	onMount(() => {
		const cancelInit = executor.runCallback(viewModel, h => {
			state = h.initState
			handle = h
		})

		return () => {
			cancelInit()
		}
	})

	onDestroy(() => {
		if (handle?.dispose) {
			executor.runCallback(handle.dispose)
		}
	})

	return $derived.by(() => {
		if (!initialized || !handle?.dispatch || !state) return undefined

		const dispatch = handle.dispatch

		return {
			dispatch: (m: M) => executor.runCallback(dispatch(m)),
			state,
		}
	})
}
