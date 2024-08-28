import {
	Da,
	HS,
	M,
	NEHS,
	NETS,
	O,
	pipe,
} from '@/core/imports.js'

import type { App } from '@/app/index.js'

import {
	type Reducer,
	type Task,
} from '@/ui/core/solid-js.js'

import {
	InternalMessage,
	Message,
} from './actions.js'
import type { State } from './index.js'
import * as Mu from './mutations.js'
import * as Ta from './tasks.js'

export const reducer: (
	app: App,
) => Reducer<State, Message | InternalMessage> =
	app => (snapshot, msg) =>
		pipe(
			M.value(msg),
			M.when({ _tag: 'RefreshList' }, () =>
				Da.tuple(
					HS.make(
						Mu.refreshListFinished,
						Mu.resetMessage,
					),
					HS.make(
						Ta.refreshList(
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
					let commands =
						HS.empty<
							Task<Message | InternalMessage>
						>()

					const result = NEHS.fromHashSet(
						snapshot.selectedProducts,
					)
					if (O.isSome(result)) {
						commands = pipe(
							commands,
							HS.add(
								Ta.deleteByIdsAndRefresh(
									result.value,
									app.deleteProductsByIds,
									app.productList,
								),
							),
						)
					}

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
							Mu.refreshListFinished,
							Mu.refreshListSucceeded(
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
							Mu.refreshListFailed,
							Mu.refreshListFinished,
							Mu.showErrorMessage(message),
						),
						HS.empty(),
					),
			),
			M.when(
				{ _tag: 'DeleteProductsFailed' },
				({ message }) =>
					Da.tuple(
						HS.make(
							Mu.deletingFinished,
							Mu.showErrorMessage(message),
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
							Mu.deletingSucceeded,
							Mu.refreshListFailed,
							Mu.deletingFinished,
							Mu.showErrorMessage(message),
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
							Mu.deletingSucceeded,
							Mu.deletingFinished,
							Mu.refreshListSucceeded(
								total,
								snapshot.products,
								models,
							),
							Mu.showSuccessMessage(
								NETS.unsafe_fromString(
									`${deletedItems.toString(10)} products deleted`,
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
