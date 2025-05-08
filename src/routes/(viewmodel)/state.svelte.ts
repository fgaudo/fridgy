import { SvelteSet } from 'svelte/reactivity'

import { B } from '$lib/core/imports.ts'
import { unsafe_fromNumber } from '$lib/core/integer/index.ts'

import { GetSortedProducts } from '$lib/business/index.ts'

export type ProductViewModel =
	| ((GetSortedProducts.Product & {
			isCorrupt: false
	  }) & { isSelected: boolean })
	| (GetSortedProducts.Product & {
			isCorrupt: true
	  })

export type FetchId = B.Branded<symbol, 'FetchId'>
export const FetchId = () =>
	B.nominal<FetchId>()(Symbol())

export type State = {
	isMenuOpen: boolean
	receivedError: boolean
	currentTimestamp: number
	refreshTimeListenersRegistered: boolean
	refreshingTaskId?: FetchId
	deletingRunning: boolean
	isLoading: boolean
	products?: {
		selected: SvelteSet<string>
		entries: ProductViewModel[]
	}
}

export type StateContext = ReturnType<
	typeof createStateContext
>

export function hasProducts(
	state: State,
): state is State & {
	products: {
		selectedProducts: SvelteSet<string>
		entries: ProductViewModel[]
	}
} {
	return state.products !== undefined
}

export function createStateContext() {
	const state = $state<State>({
		isMenuOpen: false,
		receivedError: false,
		isLoading: true,
		deletingRunning: false,
		refreshTimeListenersRegistered: false,
		currentTimestamp: Date.now(),
	})

	const currentTimestamp = unsafe_fromNumber(
		state.currentTimestamp,
	)

	const isSelectModeEnabled = $derived(
		(state.products?.selected.size ?? 0) > 0,
	)

	const hasLoadedProducts = $derived(
		state.products !== undefined,
	)

	const refreshTimeListenersEnabled = $derived(
		(state.products?.entries.length ?? 0) > 0,
	)

	const isLoading = $derived(
		state.products === undefined,
	)

	return {
		state,
		derived: {
			get hasLoadedProducts() {
				return hasLoadedProducts
			},
			get isSelectModeEnabled() {
				return isSelectModeEnabled
			},
			get isLoading() {
				return isLoading
			},
			get hasProducts() {
				return hasLoadedProducts
			},
			get refreshTimeListenersEnabled() {
				return refreshTimeListenersEnabled
			},
			get currentTimestamp() {
				return currentTimestamp
			},
		},
	}
}
