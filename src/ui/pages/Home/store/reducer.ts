import { produce } from 'solid-js/store'

import {
	Da,
	HS,
	Int,
	M,
	NETS,
	O,
	flow,
	pipe,
} from '@/core/imports'

import type { App } from '@/app/index'

import { type Reducer } from '@/ui/core/solid-js'

import type { State } from '.'
import {
	InternalMessage,
	Message,
} from './actions'
import {
	deletingFinishedMutation,
	deletingSucceededMutation,
	refreshListFailedMutation,
	refreshListFinishedMutation,
	refreshListSucceededMutation,
	resetMessageMutation,
	showErrorMessageMutation,
	showSuccessMessageMutation,
} from './mutations'
import {
	deleteTask,
	refreshListTask,
} from './tasks'

export const reducer: (
	app: App,
) => Reducer<State, Message | InternalMessage> =
	app => (snapshot, msg) =>
		pipe(
			M.value(msg),
			M.when({ _tag: 'RefreshList' }, () =>
				Da.tuple(
					flow(
						refreshListFinishedMutation,
						resetMessageMutation,
					),
					[
						refreshListTask(
							snapshot.runningRefreshing,
							app.productList,
						),
					],
				),
			),
			M.when(
				{ _tag: 'ClearSelectedProducts' },
				() =>
					Da.tuple(
						produce((state: State) => {
							state.selectedProducts = HS.empty()
						}),
						[],
					),
			),
			M.when({ _tag: 'ToggleItem' }, ({ id }) =>
				Da.tuple(
					produce((state: State) => {
						state.selectedProducts = HS.toggle(
							id,
						)(state.selectedProducts)
					}),
					[],
				),
			),

			M.when(
				{ _tag: 'DeleteProductsAndRefresh' },
				() => {
					const mutation = (state: State) => state

					const commands = Array.from(
						(function* () {
							if (
								HS.size(
									snapshot.selectedProducts,
								) > 0
							) {
								yield deleteTask(
									snapshot.selectedProducts,
									app.deleteProductsByIds,
									app.productList,
								)
							}
						})(),
					)

					return Da.tuple(mutation, commands)
				},
			),
			M.when(
				{ _tag: 'RefreshListSucceeded' },
				({ total, models }) =>
					Da.tuple(
						flow(
							produce((state: State) => {
								state.isLoading = false
								state.receivedError = false
							}),
							refreshListFinishedMutation,
							refreshListSucceededMutation(
								total,
								snapshot.products,
								models,
							),
						),
						[],
					),
			),
			M.when(
				{ _tag: 'RefreshListStarted' },
				({ fiber }) =>
					Da.tuple(
						produce((state: State) => {
							state.runningRefreshing =
								O.some(fiber)
						}),
						[],
					),
			),
			M.when(
				{ _tag: 'RefreshListFailed' },
				({ message }) =>
					Da.tuple(
						flow(
							produce((state: State) => {
								state.isLoading = false
							}),
							refreshListFailedMutation,
							refreshListFinishedMutation,
							showErrorMessageMutation(message),
						),
						[],
					),
			),
			M.when(
				{ _tag: 'DeleteProductsFailed' },
				({ message }) =>
					Da.tuple(
						flow(
							deletingFinishedMutation,
							showErrorMessageMutation(message),
						),
						[],
					),
			),
			M.when(
				{
					_tag: 'DeleteProductsSucceededAndRefreshFailed',
				},
				({ message }) =>
					Da.tuple(
						flow(
							deletingSucceededMutation,
							refreshListFailedMutation,
							deletingFinishedMutation,
							showErrorMessageMutation(message),
						),
						[],
					),
			),
			M.when(
				{
					_tag: 'DeleteProductsAndRefreshSucceeded',
				},
				({ deletedItems, total, models }) =>
					Da.tuple(
						flow(
							deletingSucceededMutation,
							deletingFinishedMutation,
							refreshListSucceededMutation(
								total,
								snapshot.products,
								models,
							),
							showSuccessMessageMutation(
								NETS.unsafe_fromString(
									`${Int.toNumber(deletedItems).toString(10)} products deleted`,
								),
							),
						),
						[],
					),
			),
			M.when(
				{
					_tag: 'DeleteProductsAndRefreshStarted',
				},
				({ fiber }) =>
					Da.tuple(
						produce((state: State) => {
							state.runningDeleting =
								O.some(fiber)
						}),
						[],
					),
			),

			M.exhaustive,
		)
