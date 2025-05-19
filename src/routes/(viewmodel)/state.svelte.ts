import { SvelteSet } from 'svelte/reactivity'

import { O, Sc } from '$lib/core/imports.ts'

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
	refreshingTaskId: symbol | undefined
	isDeleteRunning: boolean
	hasCrashOccurred: boolean
	products: ProductViewModel[] | undefined
	receivedError: boolean
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
		hasCrashOccurred: false,
		isDeleteRunning: false,
		products: undefined,
		receivedError: false,
		refreshingTaskId: undefined,
	})

	const maybeLoadedNonEmptyProducts = $derived(
		O.fromNullable(state.products).pipe(O.filter(p => p.entries.length > 0)),
	)

	return {
		state,
		derived: {
			get maybeLoadedProducts() {
				return maybeLoadedNonEmptyProducts
			},
		},
	}
}
