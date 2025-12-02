import { type BackButtonListenerEvent, App as CAP } from '@capacitor/app'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { pipe } from 'effect/Function'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Runtime from 'effect/Runtime'
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

export const useViewmodel = <S, M, R>({
	runtime,
	initState,
	makeViewModel,
	messages,
}: {
	runtime: ManagedRuntime.ManagedRuntime<R, never>
	initState: S
	makeViewModel: Effect.Effect<ViewModel<S, M, R>>
	messages?: (m: M) => void
}) => {
	let state = $state.raw<S>(initState)

	let viewModel = $state.raw<Effect.Effect.Success<typeof makeViewModel>>()

	let initialized = $state({ changes: false, messages: false })

	onMount(() => {
		const cancelMakeStateManager = runtime.runCallback(makeViewModel, {
			onExit: v => {
				if (Exit.isSuccess(v)) {
					viewModel = v.value
				}
			},
		})

		return () => {
			cancelMakeStateManager()
		}
	})

	$effect(() => {
		if (!viewModel) {
			return
		}

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

		let cancelMessages: Runtime.Cancel<void>

		if (messages) {
			cancelMessages = runtime.runCallback(
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
		} else {
			initialized.messages = true
			cancelMessages = () => {}
		}

		return () => {
			cancelChanges()
			cancelMessages?.()
		}
	})

	$effect(() => {
		if (!initialized.changes || !initialized.messages || !viewModel) {
			return
		}

		const cancelRun = runtime.runCallback(viewModel.start)

		return () => {
			cancelRun()
		}
	})

	onDestroy(() => {
		if (viewModel) {
			runtime.runCallback(viewModel.dispose)
		}
	})

	return {
		get state() {
			return state
		},
	}
}
