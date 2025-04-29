import {
	Int,
	NETS,
	O,
	pipe,
} from '$lib/core/imports.ts'
import { asOption } from '$lib/core/utils.ts'

import { GetSortedProducts } from '$lib/business/index.ts'

export type ProductViewModel =
	GetSortedProducts.Product & {
		isSelected?: boolean
	}

export type CorruptProductViewModel =
	GetSortedProducts.CorruptProduct

type State = {
	name: string
	expirationDate?: number
	currentDate: number
	isAdding: boolean
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
		NETS.fromString(state.name),
	)

	const isNameValid = $derived(
		O.isSome(maybeName),
	)

	const isSubmittable = $derived(
		isNameValid && !state.isAdding,
	)

	const isNameValidAndWasTouched = $derived(
		isNameValid && state.hasInteractedWithName,
	)

	const maybeExpirationDate = $derived(
		pipe(
			asOption(state.expirationDate),
			O.flatMap(Int.fromNumber),
		),
	)

	const maybeToastMessage = $derived(
		NETS.fromString(state.toastMessage ?? ''),
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

	const toastHasMessage = $derived(
		(state.toastMessage?.length ?? 0) > 0,
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
			get toastHasMessage() {
				return toastHasMessage
			},

			get isNameValidAndWasTouched() {
				return isNameValidAndWasTouched
			},

			get formattedExpirationDateOrEmpty() {
				return formattedExpirationDateOrEmpty
			},
		},
	}
}
