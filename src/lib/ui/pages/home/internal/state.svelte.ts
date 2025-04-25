import { SvelteSet } from 'svelte/reactivity'

import { GetSortedProducts } from '$lib/business/index.ts'

export type ProductViewModel =
	GetSortedProducts.Product & {
		isSelected?: boolean
	}

export type CorruptProductViewModel =
	GetSortedProducts.CorruptProduct

type State = {
	isMenuOpen: boolean
	selected: SvelteSet<string>
	receivedError: boolean
	isLoading: boolean
	total: number
	currentTimestamp: number
	refreshTimeListenersRegistered: boolean
	products: {
		entries: ProductViewModel[]
		corrupts: CorruptProductViewModel[]
	}
}

export type StateContext = ReturnType<
	typeof createStateContext
>

export function createStateContext() {
	const state = $state<State>({
		isMenuOpen: false,
		isLoading: false,
		selected: new SvelteSet(),
		receivedError: false,
		total: 0,
		refreshTimeListenersRegistered: false,
		products: {
			entries: [],
			corrupts: [],
		},
		currentTimestamp: Date.now(),
	})

	const isSelectModeEnabled = $derived(
		state.selected.size > 0,
	)

	const hasProducts = $derived(
		state.products.corrupts.length > 0 ||
			state.products.entries.length > 0,
	)

	const refreshTimeListenersEnabled = $derived(
		hasProducts &&
			state.refreshTimeListenersRegistered,
	)

	return {
		state,
		derived: {
			get isSelectModeEnabled() {
				return isSelectModeEnabled
			},
			get hasProducts() {
				return hasProducts
			},
			get refreshTimeListenersEnabled() {
				return refreshTimeListenersEnabled
			},
		},
	}
}
