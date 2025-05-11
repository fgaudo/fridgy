import { SvelteSet } from 'svelte/reactivity'

import { B, Int, O } from '$lib/core/imports.ts'

import type { GetSortedProducts } from '$lib/business/index.ts'

export type ProductViewModel =
	| ((GetSortedProducts.Product & {
			isCorrupt: false
	  }) & { isSelected: boolean })
	| (GetSortedProducts.Product & {
			isCorrupt: true
			id: symbol
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
	isDeleteRunning: boolean
	spinnerTaskId?: symbol
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
		isLoading: false,
		isDeleteRunning: false,
		refreshTimeListenersRegistered: false,
		currentTimestamp: Date.now(),
	})

	const currentTimestamp = $derived(
		Int.unsafeMake(state.currentTimestamp),
	)

	const maybeNonEmptySelected = $derived(
		O.fromNullable(state.products?.selected).pipe(
			O.filter(s => s.size > 0),
		),
	)

	const refreshTimeListenersEnabled = $derived(
		(state.products?.entries.length ?? 0) > 0,
	)

	const maybeLoadedNonEmptyProducts = $derived(
		O.fromNullable(state.products).pipe(
			O.filter(p => p.entries.length > 0),
		),
	)

	return {
		state,
		derived: {
			get maybeLoadedProducts() {
				return maybeLoadedNonEmptyProducts
			},
			get maybeNonEmptySelected() {
				return maybeNonEmptySelected
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
