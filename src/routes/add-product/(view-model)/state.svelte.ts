import {
	Int,
	NETS,
	O,
	pipe,
} from '$lib/core/imports.ts'

export type State = {
	name: string
	expirationDate?: number
	currentDate: number
	isAdding: boolean
	adding?: symbol
	toastMessage?: string
	hasInteractedWithName: boolean
}

export type StateContext = ReturnType<
	typeof createStateContext
>

export function createStateContext() {
	const state = $state<State>({
		currentDate: Date.now(),
		isAdding: false,
		name: '',
		hasInteractedWithName: false,
	})

	const maybeName = $derived(
		NETS.makeWithTrimming(state.name),
	)

	const isNameValid = $derived(
		O.isSome(maybeName),
	)

	const isSubmittable = $derived(
		isNameValid && !state.isAdding,
	)

	const isNameValidOrUntouched = $derived(
		isNameValid || !state.hasInteractedWithName,
	)

	const maybeExpirationDate = $derived(
		pipe(
			O.fromNullable(state.expirationDate),
			O.flatMap(Int.make),
		),
	)

	const maybeToastMessage = $derived(
		pipe(
			O.fromNullable(state.toastMessage),
			O.flatMap(NETS.makeWithTrimming),
		),
	)

	const formattedCurrentDate = $derived(
		new Date(state.currentDate)
			.toISOString()
			.substring(0, 10),
	)

	const formattedExpirationDateOrEmpty = $derived(
		state.expirationDate
			? new Date(state.expirationDate)
					.toISOString()
					.substring(0, 10)
			: '',
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
