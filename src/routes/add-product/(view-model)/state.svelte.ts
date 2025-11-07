import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'

import * as Integer from '../../../core/integer'
import * as NonEmptyTrimmedString from '../../../core/non-empty-trimmed-string'

export type State = {
	name: string
	expirationDate: number | undefined
	currentDate: number
	isAdding: boolean
	isLoading: boolean
	hasCrashOccurred: boolean

	toastMessage: string
	toastId: symbol | undefined
	toastType: `error` | `success`

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
		toastMessage: ``,
		toastId: undefined,
		toastType: `success`,
		spinnerId: undefined,
		hasCrashOccurred: false,
		hasInteractedWithName: false,
	})

	const maybeName = $derived(NonEmptyTrimmedString.fromString(state.name))

	const isNameValid = $derived(Option.isSome(maybeName))

	const isSubmittable = $derived(isNameValid && !state.isAdding)

	const isNameValidOrUntouched = $derived(
		isNameValid || !state.hasInteractedWithName,
	)

	const maybeExpirationDate = $derived(
		pipe(
			Option.fromNullable(state.expirationDate),
			Option.flatMap(Integer.fromNumber),
		),
	)

	const maybeToastMessage = $derived(Option.fromNullable(state.toastMessage))

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
