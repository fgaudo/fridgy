import { type BackButtonListenerEvent, App as CAP } from '@capacitor/app'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { pipe } from 'effect/Function'
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
	makeViewModel: Effect.Effect<ViewModel<S, M1, M2, R>>
	messages?: (m: M2) => void
}) => {
	let state = $state.raw<S>()

	let viewModel = $state.raw<Effect.Effect.Success<typeof makeViewModel>>()

	let handle =
		$state.raw<
			Effect.Effect.Success<Effect.Effect.Success<typeof makeViewModel>['run']>
		>()

	let initialized = $state({ changes: false, messages: false })

	$effect(() => {
		if (!viewModel) {
			return
		}

		if (!initialized.changes || !initialized.messages) {
			return
		}

		const cancelRun = runtime.runCallback(viewModel.run, {
			onExit: h => {
				if (Exit.isSuccess(h)) {
					handle = h.value
				}
			},
		})

		return () => {
			cancelRun()
		}
	})

	$effect(() => {
		if (!viewModel) return

		const cancelChanges = runtime.runCallback(
			pipe(
				viewModel.stateChanges,
				Stream.onStart(
					Effect.sync(() => {
						initialized.changes = true
					}),
				),
				Stream.runForEach(s =>
					Effect.sync(() => {
						state = s
					}),
				),
			),
		)

		const cancelMessages = messages
			? runtime.runCallback(
					pipe(
						viewModel.messages,
						Stream.onStart(
							Effect.sync(() => {
								initialized.messages = true
							}),
						),
						Stream.runForEach(m => Effect.sync(() => messages(m))),
					),
				)
			: undefined

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
					viewModel = h.value
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

	const publicViewModel = $derived.by(() => {
		if (handle === undefined || state === undefined) {
			return undefined
		}

		const dispatch = handle.dispatch

		return {
			dispatch: (m: M1) => runtime.runCallback(dispatch(m)),
			state: state,
		}
	})

	return {
		get viewModel() {
			return publicViewModel
		},
	}
}
