import { SvelteSet } from 'svelte/reactivity'

import { Int, O, Sc } from '$lib/core/imports.ts'

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

export type State = {
	receivedError: boolean
	currentTimestamp: number
	refreshingTaskId: symbol | undefined
	isDeleteRunning: boolean
	spinnerTaskId: symbol | undefined
	hasCrashOccurred: boolean
	toastMessage:
		| { id: symbol; message: string; type: `error` | `success` }
		| undefined
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
		receivedError: false,
		hasCrashOccurred: false,
		isLoading: false,
		isDeleteRunning: false,
		toastMessage: undefined,
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

	const hasSelectedProducts = $derived(
		O.fromNullable(state.products).pipe(
			O.map(products => products.selected.size > 0),
			O.getOrElse(() => false),
		),
	)

	const maybeToastMessage = $derived(O.fromNullable(state.toastMessage))

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
			get hasSelectedProducts() {
				return hasSelectedProducts
			},
			get maybeToastMessage() {
				return maybeToastMessage
			},
		},
	}
}
