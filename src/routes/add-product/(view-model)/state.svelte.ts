import { Int, NETS, O, pipe } from '$lib/core/imports.ts'

export type State = {
	name: string
	expirationDate: number | undefined
	currentDate: number
	isAdding: boolean
	isLoading: boolean
	toastMessage: { message: string; id: symbol } | undefined
	hasInteractedWithName: boolean
	spinnerId: symbol | undefined
}

export type StateContext = ReturnType<typeof createStateContext>

export function createStateContext() {
	const state = $state<State>({
		currentDate: Date.now(),
		isAdding: false,
		isLoading: false,
		name: ``,
		expirationDate: undefined,
		toastMessage: undefined,
		spinnerId: undefined,
		hasInteractedWithName: false,
	})

	const maybeName = $derived(NETS.fromString(state.name))

	const isNameValid = $derived(O.isSome(maybeName))

	const isSubmittable = $derived(isNameValid && !state.isAdding)

	const isNameValidOrUntouched = $derived(
		isNameValid || !state.hasInteractedWithName,
	)

	const maybeExpirationDate = $derived(
		pipe(O.fromNullable(state.expirationDate), O.flatMap(Int.fromNumber)),
	)

	const maybeToastMessage = $derived(
		pipe(
			O.fromNullable(state.toastMessage),
			O.map(toast => toast.message),
			O.flatMap(NETS.fromString),
		),
	)

	const formattedCurrentDate = $derived(
		new Date(state.currentDate).toISOString().substring(0, 10),
	)

	const formattedExpirationDateOrEmpty = $derived(
		state.expirationDate
			? new Date(state.expirationDate).toISOString().substring(0, 10)
			: ``,
	)

	return {
		state,
		derived: {
			get maybeExpirationDate() {
				return maybeExpirationDate
			},
			get maybeToastMessage() {
				return maybeToastMessage
			},
			get maybeName() {
				return maybeName
			},
			get isSubmittable() {
				return isSubmittable
			},
			get isNameValid() {
				return isNameValid
			},
			get formattedCurrentDate() {
				return formattedCurrentDate
			},

			get isNameValidOrUntouched() {
				return isNameValidOrUntouched
			},

			get formattedExpirationDateOrEmpty() {
				return formattedExpirationDateOrEmpty
			},
		},
	}
}
