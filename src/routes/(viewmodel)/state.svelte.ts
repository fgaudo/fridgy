import { SvelteSet } from 'svelte/reactivity'

import { A, Int, O, Sc } from '$lib/core/imports.ts'

export const ProductViewModel = Sc.mutable(
	Sc.Union(
		Sc.Struct({
			isCorrupt: Sc.Literal(false),
			id: Sc.String,
			maybeName: Sc.UndefinedOr(Sc.String),
			maybeExpirationDate: Sc.UndefinedOr(Sc.Number),
			maybeCreationDate: Sc.UndefinedOr(Sc.Number),
			maybeStorage: Sc.UndefinedOr(
				Sc.Union(Sc.Literal(`fridge`), Sc.Literal(`freezer`)),
			),
			isValid: Sc.Literal(false),
			isSelected: Sc.Boolean,
		}),
		Sc.Struct({
			isCorrupt: Sc.Literal(false),
			id: Sc.String,
			name: Sc.String,
			maybeExpirationDate: Sc.UndefinedOr(Sc.Number),
			maybeStorage: Sc.UndefinedOr(
				Sc.Union(Sc.Literal(`fridge`), Sc.Literal(`freezer`)),
			),
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
	currentTimestamp: number | undefined
	isMenuOpen: boolean
	refreshingTaskId: symbol | undefined
	deletingTaskId: symbol | undefined
	spinnerTaskId: symbol | undefined
	hasCrashOccurred: boolean
	storage: `fridge` | `freezer` | `other`
	products: ProductViewModel[]
	selected: SvelteSet<string>
	toastMessage:
		| { id: symbol; message: string; type: `error` | `success` }
		| undefined
}

export type StateContext = ReturnType<typeof createStateContext>

export function createStateContext() {
	const state = $state<State>({
		hasCrashOccurred: false,
		deletingTaskId: undefined,
		storage: `fridge`,
		isMenuOpen: false,
		toastMessage: undefined,
		currentTimestamp: undefined,
		spinnerTaskId: undefined,
		refreshingTaskId: undefined,
		products: [],
		selected: new SvelteSet(),
	})

	const maybeCurrentTimestamp = $derived(
		O.fromNullable(state.currentTimestamp).pipe(O.map(Int.unsafeFromNumber)),
	)

	const uncategorizedProducts = $derived(
		A.filter(
			state.products,
			product => product.isCorrupt || product.maybeStorage === undefined,
		),
	)

	const fridgeProducts = $derived(
		A.filter(
			state.products,
			product => !product.isCorrupt && product.maybeStorage === `fridge`,
		),
	)

	const freezerProducts = $derived(
		A.filter(
			state.products,
			product => !product.isCorrupt && product.maybeStorage === `freezer`,
		),
	)

	const refreshTimeListenersEnabled = $derived(
		(state.storage === `other` &&
			A.findFirstIndex(
				uncategorizedProducts,
				e => !e.isCorrupt && e.maybeExpirationDate !== undefined,
			).pipe(O.isSome)) ||
			(state.storage === `fridge` &&
				A.findFirstIndex(
					fridgeProducts,
					e => !e.isCorrupt && e.maybeExpirationDate !== undefined,
				).pipe(O.isSome)) ||
			(state.storage === `freezer` &&
				A.findFirstIndex(
					freezerProducts,
					e => !e.isCorrupt && e.maybeExpirationDate !== undefined,
				).pipe(O.isSome)),
	)

	const selected = $derived({
		isEmpty: state.selected.size <= 0,
		size: state.selected.size,
		products: state.selected,
	})

	const maybeToastMessage = $derived(O.fromNullable(state.toastMessage))

	return {
		state,
		derived: {
			get selected() {
				return selected
			},
			get refreshTimeListenersEnabled() {
				return refreshTimeListenersEnabled
			},
			get currentTimestamp() {
				return maybeCurrentTimestamp
			},
			get maybeToastMessage() {
				return maybeToastMessage
			},
		},
	}
}
