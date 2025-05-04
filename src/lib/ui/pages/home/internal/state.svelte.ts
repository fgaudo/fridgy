import { SvelteSet } from 'svelte/reactivity'

import { O } from '$lib/core/imports.ts'
import { unsafe_fromNumber } from '$lib/core/integer/index.ts'

import { GetSortedProducts } from '$lib/business/index.ts'

export type ProductViewModel =
	GetSortedProducts.Product

type State = {
	isMenuOpen: boolean
	receivedError: boolean
	currentTimestamp: number
	refreshTimeListenersRegistered: boolean
	products?: {
		entries: ProductViewModel[]
		selected: SvelteSet<string>
	}
}

export type StateContext = ReturnType<
	typeof createStateContext
>

export function createStateContext() {
	const state = $state<State>({
		isMenuOpen: false,
		receivedError: false,
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

	const products = $derived(
		O.fromNullable(state.products),
	)

	const refreshTimeListenersEnabled = $derived(
		(state.products?.entries.findIndex(
			product =>
				product._tag === 'UncorruptProduct' &&
				O.isSome(
					asOption(product.maybeExpirationDate),
				),
		) ?? -1) >= 0 &&
			state.refreshTimeListenersRegistered,
	)

	const isLoading = $derived(
		state.products === undefined,
	)

	return {
		state,
		derived: {
			get maybeTotal() {
				return maybeTotal
			},
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
