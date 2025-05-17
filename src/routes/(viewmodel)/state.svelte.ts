import { SvelteSet } from 'svelte/reactivity'

import { B, Int, O, Sc } from '$lib/core/imports.ts'

export const ProductViewModel = Sc.mutable(
	Sc.Union(
		Sc.Struct({
			isCorrupt: Sc.Literal(false),
			id: Sc.String,
			maybeName: Sc.UndefinedOr(Sc.String),
			maybeExpirationDate: Sc.UndefinedOr(Sc.Number),
			maybeCreationDate: Sc.UndefinedOr(Sc.Number),
			isValid: Sc.Literal(false),
			isSelected: Sc.Boolean,
		}),
		Sc.Struct({
			isCorrupt: Sc.Literal(false),
			id: Sc.String,
			name: Sc.String,
			maybeExpirationDate: Sc.UndefinedOr(Sc.Number),
			creationDate: Sc.Number,
			isValid: Sc.Literal(true),
			isSelected: Sc.Boolean,
		}),
		Sc.Struct({
			id: Sc.Symbol,
			isCorrupt: Sc.Literal(true),
			maybeName: Sc.UndefinedOr(Sc.NonEmptyTrimmedString),
		}),
	),
)

export type ProductViewModel = Sc.Schema.Type<typeof ProductViewModel>

export type FetchId = B.Branded<symbol, `FetchId`>
export const FetchId = () => B.nominal<FetchId>()(Symbol())

export type State = {
	isMenuOpen: boolean
	receivedError: boolean
	currentTimestamp: number
	refreshingTaskId: FetchId | undefined
	isDeleteRunning: boolean
	spinnerTaskId: symbol | undefined
	refreshTimeTask: symbol | undefined
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
		currentTimestamp: Date.now(),
		refreshTimeTask: undefined,
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
