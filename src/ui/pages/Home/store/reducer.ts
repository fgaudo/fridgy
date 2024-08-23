import {
	Da,
	HS,
	Int,
	M,
	NETS,
	O,
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
					HS.make(
						refreshListFinishedMutation,
						resetMessageMutation,
					),
					HS.make(
						refreshListTask(
							snapshot.runningRefreshing,
							app.productList,
						),
					),
				),
			),
			M.when(
				{ _tag: 'ClearSelectedProducts' },
				() =>
					Da.tuple(
						HS.make((state: State) => {
							state.selectedProducts = HS.empty()
						}),
						HS.empty(),
					),
			),
			M.when({ _tag: 'ToggleItem' }, ({ id }) =>
				Da.tuple(
					HS.make((state: State) => {
						state.selectedProducts = HS.toggle(
							id,
						)(snapshot.selectedProducts)
					}),
					HS.empty(),
				),
			),

			M.when(
				{ _tag: 'DeleteProductsAndRefresh' },
				() => {
					const commands = HS.fromIterable(
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

					return Da.tuple(HS.empty(), commands)
				},
			),
			M.when(
				{ _tag: 'RefreshListSucceeded' },
				({ total, models }) =>
					Da.tuple(
						HS.make(
							(state: State) => {
								state.isLoading = false
								state.receivedError = false
							},
							refreshListFinishedMutation,
							refreshListSucceededMutation(
								total,
								snapshot.products,
								models,
							),
						),
						HS.empty(),
					),
			),
			M.when(
				{ _tag: 'RefreshListStarted' },
				({ fiber }) =>
					Da.tuple(
						HS.make((state: State) => {
							state.runningRefreshing =
								O.some(fiber)
						}),
						HS.empty(),
					),
			),
			M.when(
				{ _tag: 'RefreshListFailed' },
				({ message }) =>
					Da.tuple(
						HS.make(
							(state: State) => {
								state.isLoading = false
							},
							refreshListFailedMutation,
							refreshListFinishedMutation,
							showErrorMessageMutation(message),
						),
						HS.empty(),
					),
			),
			M.when(
				{ _tag: 'DeleteProductsFailed' },
				({ message }) =>
					Da.tuple(
						HS.make(
							deletingFinishedMutation,
							showErrorMessageMutation(message),
						),
						HS.empty(),
					),
			),
			M.when(
				{
					_tag: 'DeleteProductsSucceededAndRefreshFailed',
				},
				({ message }) =>
					Da.tuple(
						HS.make(
							deletingSucceededMutation,
							refreshListFailedMutation,
							deletingFinishedMutation,
							showErrorMessageMutation(message),
						),
						HS.empty(),
					),
			),
			M.when(
				{
					_tag: 'DeleteProductsAndRefreshSucceeded',
				},
				({ deletedItems, total, models }) =>
					Da.tuple(
						HS.make(
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
						HS.empty(),
					),
			),
			M.when(
				{
					_tag: 'DeleteProductsAndRefreshStarted',
				},
				({ fiber }) =>
					Da.tuple(
						HS.make((state: State) => {
							state.runningDeleting =
								O.some(fiber)
						}),
						HS.empty(),
					),
			),

			M.exhaustive,
		)
