import 'solid-js/store'

import { NETS, O } from '@/core/imports'

import type { State } from '.'

export const showSuccessMessageMutation =
	(message: NETS.NonEmptyTrimmedString) =>
	(state: State) => {
		state.message = O.some({
			type: 'success',
			text: message,
		} as const)
	}

export const showErrorMessageMutation =
	(message: NETS.NonEmptyTrimmedString) =>
	(state: State) => {
		state.message = O.some({
			type: 'error',
			text: message,
		} as const)
	}

export const addProductFinishedMutation = (
	state: State,
) => {
	state.runningAddProduct = O.none()
}

export const resetMessageMutation = (
	state: State,
) => {
	state.message = O.none()
}

export const validateFieldsMutation =
	(fields: State['formFields']) =>
	(state: State) => {
		state.isOk = NETS.fromString(
			fields.name,
		).pipe(O.isSome)
	}

export const defaultFields: () => State['formFields'] =
	() => ({
		name: '',
		expirationDate: O.none(),
	})

export const resetFields = (state: State) => {
	state.formFields = defaultFields()

	validateFieldsMutation(defaultFields())(state)
}
