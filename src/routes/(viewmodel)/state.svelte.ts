import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import { SvelteSet } from 'svelte/reactivity'

import * as Integer from '$lib/core/integer/index.ts'

export const ProductViewModel = Schema.mutable(
	Schema.Union(
		Schema.Struct({
			isCorrupt: Schema.Literal(false),
			id: Schema.String,
			maybeName: Schema.UndefinedOr(Schema.String),
			maybeExpirationDate: Schema.UndefinedOr(Schema.Number),
			maybeCreationDate: Schema.UndefinedOr(Schema.Number),
			isValid: Schema.Literal(false),
			isSelected: Schema.Boolean,
		}),
		Schema.Struct({
			isCorrupt: Schema.Literal(false),
			id: Schema.String,
			name: Schema.String,
			maybeExpirationDate: Schema.UndefinedOr(Schema.Number),
			creationDate: Schema.Number,
			isValid: Schema.Literal(true),
			isSelected: Schema.Boolean,
		}),
		Schema.Struct({
			id: Schema.Symbol,
			isCorrupt: Schema.Literal(true),
			maybeName: Schema.UndefinedOr(Schema.NonEmptyTrimmedString),
		}),
	),
)

export type ProductViewModel = Schema.Schema.Type<typeof ProductViewModel>

export type State = {
	receivedError: boolean
	currentTimestamp: number
	isMenuOpen: boolean
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
		isMenuOpen: false,
		toastMessage: undefined,
		currentTimestamp: Date.now(),
		products: undefined,
		spinnerTaskId: undefined,
		refreshingTaskId: undefined,
	})

	const currentTimestamp = $derived(
		Integer.unsafeFromNumber(state.currentTimestamp),
	)

	const maybeNonEmptySelected = $derived(
		Option.fromNullable(state.products?.selected).pipe(
			Option.filter(s => s.size > 0),
		),
	)

	const refreshTimeListenersEnabled = $derived(
		state.products !== undefined &&
			state.products.entries.findIndex(
				e => !e.isCorrupt && e.maybeExpirationDate !== undefined,
			) >= 0,
	)

	const maybeLoadedNonEmptyProducts = $derived(
		Option.fromNullable(state.products).pipe(
			Option.filter(p => p.entries.length > 0),
		),
	)

	const hasSelectedProducts = $derived(
		Option.fromNullable(state.products).pipe(
			Option.map(products => products.selected.size > 0),
			Option.getOrElse(() => false),
		),
	)

	const maybeToastMessage = $derived(Option.fromNullable(state.toastMessage))

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
