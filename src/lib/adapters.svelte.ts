import { type BackButtonListenerEvent, App as CAP } from '@capacitor/app'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Stream from 'effect/Stream'
import { onDestroy, onMount } from 'svelte'

import type { ViewModel } from '@/core/viewmodel.ts'

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

export const useViewmodel = <S, M1, M2, R>({
	runtime,
	makeViewModel,
	messages,
}: {
	runtime: ManagedRuntime.ManagedRuntime<R, never>
	makeViewModel: Effect.Effect<ViewModel<S, M1, M2>, never, R>
	messages?: (m: M2) => void
}): { state: S; dispatch: (m: M1) => void } | undefined => {
	let state = $state.raw<S>()

	let handle = $state.raw<Effect.Effect.Success<typeof makeViewModel>>()
	let initialized = false

	$effect(() => {
		if (!handle || initialized) return

		const cancelChanges = runtime.runCallback(
			Stream.runForEach(handle.changes, s =>
				Effect.sync(() => {
					state = s
				}),
			),
		)

		const cancelMessages = messages
			? runtime.runCallback(
					Stream.runForEach(handle.messages, m =>
						Effect.sync(() => messages(m)),
					),
				)
			: undefined

		initialized = true

		return () => {
			cancelChanges()
			cancelMessages?.()
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
			dispatch: (m: M1) => runtime.runCallback(dispatch(m)),
			state,
		}
	})
}
