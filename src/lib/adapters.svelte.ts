import { type BackButtonListenerEvent, App as CAP } from '@capacitor/app'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Stream from 'effect/Stream'
import { onDestroy, onMount } from 'svelte'

import type { StateManager } from '@/core/state-manager.ts'

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
	runtime: ManagedRuntime.ManagedRuntime<R, never>,
	makeViewModel: Effect.Effect<StateManager<S, M>, never, R>,
): { state: S; dispatch: (m: M) => void } | undefined => {
	let state = $state.raw<S>()

	let handle = $state.raw<Effect.Effect.Success<typeof makeViewModel>>()
	let initialized = false

	$effect(() => {
		if (!handle) return

		const cancelChanges = runtime.runCallback(
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
		const cancelInit = runtime.runCallback(makeViewModel, {
			onExit: h => {
				if (Exit.isSuccess(h)) {
					state = h.value.initState
					handle = h.value
				}
			},
		})

		return () => {
			cancelInit()
		}
	})

	onDestroy(() => {
		if (handle?.dispose) {
			runtime.runCallback(handle.dispose)
		}
	})

	return $derived.by(() => {
		if (!initialized || !handle?.dispatch || !state) return undefined

		const dispatch = handle.dispatch

		return {
			dispatch: (m: M) => runtime.runCallback(dispatch(m)),
			state,
		}
	})
}
