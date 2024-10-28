import 'solid-js/store'

import { NETS, O } from '@/core/imports.ts'

import type { State } from './index.ts'

export const showSuccessMessage =
	(message: NETS.NonEmptyTrimmedString) =>
	(state: State) => {
		state.message = O.some({
			type: 'success',
			text: message,
		} as const)
	}

export const showErrorMessage =
	(message: NETS.NonEmptyTrimmedString) =>
	(state: State) => {
		state.message = O.some({
			type: 'error',
			text: message,
		} as const)
	}

export const addProductFinished = (
	state: State,
) => {
	state.runningAddProduct = O.none()
}

export const resetMessage = (state: State) => {
	state.message = O.none()
}

export const validateFields =
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

export const resetAndValidateFields = (
	state: State,
) => {
	state.formFields = defaultFields()

	validateFields(defaultFields())(state)
}
