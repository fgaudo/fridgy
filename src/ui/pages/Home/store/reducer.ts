import { reconcile } from 'solid-js/store'

import {
	Da,
	HS,
	M,
	O,
	pipe,
} from '@/core/imports'

import type { App } from '@/app/index'

import type { Reducer } from '@/ui/core/solid-js'

import type { State } from '.'
import {
	InternalMessage,
	Message,
} from './actions'
import {
	deleteTask,
	refreshListTask,
} from './tasks'

export const reducer: (
	app: App,
) => Reducer<State, Message | InternalMessage> =
	app => (state, msg) =>
		pipe(
			M.value(msg),
			M.when({ _tag: 'RefreshList' }, () => {
				const newState = {
					...state,
					refreshingId: O.none(),
				} as const

				const commands = [
					refreshListTask(
						state.refreshingId,
						app.productList,
					),
				] as const

				return Da.tuple(newState, commands)
			}),
			M.when(
				{ _tag: 'ClearSelectedProducts' },
				() =>
					Da.tuple(
						{
							...state,
							selectedProducts: HS.empty(),
						} as const,
						[],
					),
			),
			M.when({ _tag: 'ToggleItem' }, ({ id }) =>
				Da.tuple(
					{
						...state,
						selectedProducts: HS.toggle(id)(
							state.selectedProducts,
						),

						selectMode:
							HS.has(id)(
								state.selectedProducts,
							) &&
							HS.size(state.selectedProducts) <= 1
								? false
								: true,
					} as const,
					[],
				),
			),
			M.when(
				{ _tag: 'ShowToast' },
				({ message }) =>
					Da.tuple(
						{ ...state, toastMessage: message },
						[],
					),
			),
			M.when({ _tag: 'DeleteProducts' }, () =>
				Da.tuple(
					state,
					HS.size(state.selectedProducts) <= 0
						? []
						: [
								deleteTask(
									state.selectedProducts,
									app.deleteProductsByIds,
								),
							],
				),
			),
			M.when(
				{ _tag: 'RefreshListSucceeded' },
				({ data: { total, models } }) =>
					Da.tuple(
						{
							...state,
							products: reconcile(
								Array.from(models),
								{ key: 'id' },
							)(state.products),
							total,
							isLoading: false,
							refreshingId: O.none(),
						},
						[],
					),
			),
			M.when(
				{ _tag: 'RefreshListStarted' },
				({ id }) =>
					Da.tuple(
						{
							...state,
							refreshingId: O.some(id),
						},
						[],
					),
			),
			M.when(
				{ _tag: 'RefreshListFailed' },
				({ message }) =>
					Da.tuple(
						{
							...state,
							refreshingId: O.none(),
						},
						[
							{
								type: 'message',
								message:
									InternalMessage.ShowToast({
										message: message,
									}),
							},
						] as const,
					),
			),
			M.when(
				{ _tag: 'DeleteProductsFailed' },
				({ message }) =>
					Da.tuple(state, [
						{
							type: 'message',
							message: InternalMessage.ShowToast({
								message,
							}),
						} as const,
					] as const),
			),
			M.when(
				{ _tag: 'DeleteProductsSucceeded' },
				() => Da.tuple(state, [] as const),
			),
			M.exhaustive,
		)
