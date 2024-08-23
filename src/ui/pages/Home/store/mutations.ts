import { reconcile } from 'solid-js/store'

import {
	HS,
	type Int,
	NETS,
	O,
} from '@/core/imports'

import type { ProductModel } from '@/app/use-cases/get-sorted-products'

import type { State } from '.'

export const refreshListSucceededMutation =
	(
		total: Int.Integer,
		before: ProductModel[],
		after: ProductModel[],
	) =>
	(state: State) => {
		state.products = reconcile(after, {
			key: 'id',
		})(before)

		state.total = total
	}

export const deletingFinishedMutation = (
	state: State,
) => {
	state.runningDeleting = O.none()
}

export const deletingSucceededMutation = (
	state: State,
) => {
	state.selectedProducts = HS.empty()
}

export const refreshListFinishedMutation = (
	state: State,
) => {
	state.runningRefreshing = O.none()
}

export const refreshListFailedMutation = (
	state: State,
) => {
	state.products = []
	state.receivedError = true
}

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

export const resetMessageMutation = (
	state: State,
) => {
	state.message = O.none()
}
