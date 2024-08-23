import { produce } from 'solid-js/store'

import { NETS, O, flow } from '@/core/imports'

import type { State } from '.'

export const showSuccessMessageMutation = (
	message: NETS.NonEmptyTrimmedString,
) =>
	produce((state: State) => {
		state.message = O.some({
			type: 'success',
			text: message,
		} as const)
	})

export const showErrorMessageMutation = (
	message: NETS.NonEmptyTrimmedString,
) =>
	produce((state: State) => {
		state.message = O.some({
			type: 'error',
			text: message,
		} as const)
	})

export const addProductFinishedMutation = produce(
	(state: State) => {
		state.runningAddProduct = O.none()
	},
)

export const resetMessageMutation = produce(
	(state: State) => {
		state.message = O.none()
	},
)

export const validateFieldsMutation = (
	fields: State['formFields'],
) =>
	produce((state: State) => {
		state.isOk = NETS.fromString(
			fields.name,
		).pipe(O.isSome)
	})

export const defaultFields: () => State['formFields'] =
	() => ({
		name: '',
		expirationDate: O.none(),
	})

export const resetFields = flow(
	produce((state: State) => {
		state.formFields = defaultFields()
	}),
	validateFieldsMutation(defaultFields()),
)
