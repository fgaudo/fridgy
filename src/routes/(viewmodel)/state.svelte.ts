import { SvelteSet } from 'svelte/reactivity'

import { B, Int, O } from '$lib/core/imports.ts'

export type ProductViewModel =
	| {
			isCorrupt: false
			id: string
			maybeName: string | undefined
			maybeExpirationDate: number | undefined
			maybeCreationDate: number | undefined
			isValid: false
			isSelected: boolean
	  }
	| {
			isCorrupt: false
			id: string
			name: string
			maybeExpirationDate: number | undefined
			creationDate: number
			isValid: true
			isSelected: boolean
	  }
	| {
			isCorrupt: true
			id: symbol
			maybeName: string | undefined
	  }

export type FetchId = B.Branded<symbol, `FetchId`>
export const FetchId = () => B.nominal<FetchId>()(Symbol())

export type State = {
	isMenuOpen: boolean
	receivedError: boolean
	currentTimestamp: number
	refreshTimeListenersRegistered: boolean
	refreshingTaskId: FetchId | undefined
	isDeleteRunning: boolean
	spinnerTaskId: symbol | undefined
	isLoading: boolean
	products:
		| {
				selected: SvelteSet<string>
				entries: ProductViewModel[]
		  }
		| undefined
}

export type StateContext = ReturnType<typeof createStateContext>

export function hasProducts(state: State): state is State & {
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
		products: undefined,
		spinnerTaskId: undefined,
		refreshingTaskId: undefined,
	})

	const currentTimestamp = $derived(
		Int.unsafeFromNumber(state.currentTimestamp),
	)

	const maybeNonEmptySelected = $derived(
		O.fromNullable(state.products?.selected).pipe(O.filter(s => s.size > 0)),
	)

	const refreshTimeListenersEnabled = $derived(
		state.products !== undefined &&
			state.products.entries.findIndex(
				e => !e.isCorrupt && e.maybeExpirationDate !== undefined,
			) >= 0,
	)

	const maybeLoadedNonEmptyProducts = $derived(
		O.fromNullable(state.products).pipe(O.filter(p => p.entries.length > 0)),
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
