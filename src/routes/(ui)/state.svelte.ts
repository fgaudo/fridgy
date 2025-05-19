import { SvelteSet } from 'svelte/reactivity'

import { O } from '$lib/core/imports.ts'

import { createViewModel } from '../(viewmodel)/index.svelte.ts'

export type State = {
	currentTimestamp: number
	isMenuOpen: boolean
	hasCrashOccurred: boolean
	isLoading: boolean
	receivedError: boolean
	selected: SvelteSet<string>
	spinnerTaskId: symbol | undefined
	toastMessage:
		| undefined
		| { type: `error` | `success`; message: string; id: symbol }
}

export function createUiState() {
	const state = $state<State>({
		currentTimestamp: Date.now(),
		isMenuOpen: false,
		hasCrashOccurred: false,
		isLoading: true,
		receivedError: false,
		selected: new SvelteSet<string>(),
		spinnerTaskId: undefined,
		toastMessage: undefined,
	})
	const maybeNonEmptySelected = $derived(
		O.fromNullable(state.selected).pipe(O.filter(s => s.size > 0)),
	)

	const refreshTimeListenersEnabled = $derived(
		viewModel.state.products &&
			viewModel.state.products.findIndex(
				e => !e.isCorrupt && e.maybeExpirationDate !== undefined,
			) >= 0,
	)

	return {
		state,
		derived: {
			maybeNonEmptySelected() {
				return maybeNonEmptySelected
			},
			refreshTimeListenersEnabled() {
				return refreshTimeListenersEnabled
			},
		},
	}
}
