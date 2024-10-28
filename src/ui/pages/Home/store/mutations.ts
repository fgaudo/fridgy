import { reconcile } from 'solid-js/store'

import {
	HS,
	NETS,
	NNInt,
	O,
} from '@/core/imports.ts'

import type { ProductModel } from '@/app/use-cases/get-sorted-products.ts'

import type { State } from './index.ts'

export const refreshListSucceeded =
	(
		total: NNInt.NonNegativeInteger,
		before: ProductModel[],
		after: ProductModel[],
	) =>
	(state: State) => {
		state.products = reconcile(after, {
			key: 'id',
		})(before)

		state.total = total
	}

export const deletingFinished = (
	state: State,
) => {
	state.runningDeleting = O.none()
}

export const deletingSucceeded = (
	state: State,
) => {
	state.selectedProducts = HS.empty()
}

export const refreshListFinished = (
	state: State,
) => {
	state.runningRefreshing = O.none()
}

export const refreshListFailed = (
	state: State,
) => {
	state.products = []
	state.receivedError = true
}

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

export const resetMessage = (state: State) => {
	state.message = O.none()
}
