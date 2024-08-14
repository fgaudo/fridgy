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
	removeToast,
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
					runningRefreshing: O.none(),
				} as const

				const commands = [
					refreshListTask(
						state.runningRefreshing,
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
				{ _tag: 'DeleteProductsAndRefresh' },
				() =>
					Da.tuple(
						state,
						HS.size(state.selectedProducts) <= 0
							? []
							: [
									deleteTask(
										state.selectedProducts,
										app.deleteProductsByIds,
										app.productList,
									),
								],
					),
			),
			M.when(
				{ _tag: 'RefreshListSucceeded' },
				({ total, models }) =>
					Da.tuple(
						{
							...state,
							products: reconcile(models)(
								state.products,
							),
							total,
							isLoading: false,
							runningRefreshing: O.none(),
							receivedError: false,
						},
						[],
					),
			),
			M.when(
				{ _tag: 'RefreshListStarted' },
				({ fiber }) =>
					Da.tuple(
						{
							...state,
							runningRefreshing: O.some(fiber),
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
							products: [],
							runningRefreshing: O.none(),
							receivedError: true,
							isLoading: false,
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
					Da.tuple(
						{
							...state,
							runningDeleting: O.none(),
						},
						[
							{
								type: 'message',
								message:
									InternalMessage.ShowToast({
										message,
									}),
							} as const,
						] as const,
					),
			),
			M.when(
				{
					_tag: 'DeleteProductsAndRefreshFailed',
				},
				({ message }) =>
					Da.tuple(
						{
							...state,
							selectedProducts: HS.empty(),
							receivedError: true,
							runningDeleting: O.none(),
							products: [],
						},
						[
							{
								type: 'message',
								message:
									InternalMessage.ShowToast({
										message,
									}),
							} as const,
						] as const,
					),
			),
			M.when(
				{
					_tag: 'DeleteProductsAndRefreshSucceeded',
				},
				({ deletedItems, total, models }) =>
					Da.tuple(
						{
							...state,
							selectedProducts: HS.empty(),
							runningDeleting: O.none(),
							products: reconcile(models)(
								state.products,
							),
							total: total,
						},
						[
							{
								type: 'message',
								message:
									InternalMessage.ShowToast({
										message: `${deletedItems.toString(10)} products deleted`,
									}),
							} as const,
						] as const,
					),
			),
			M.when(
				{
					_tag: 'DeleteProductsAndRefreshStarted',
				},
				({ fiber }) =>
					Da.tuple(
						{
							...state,
							runningDeleting: O.some(fiber),
						},
						[],
					),
			),
			M.when(
				{ _tag: 'ShowToast' },
				({ message }) =>
					Da.tuple(
						{
							...state,
							toastMessage: message,
							runningRemoveToast: O.none(),
						},
						[
							removeToast(
								state.runningRemoveToast,
							),
						],
					),
			),
			M.when({ _tag: 'RemoveToast' }, () =>
				Da.tuple(
					{
						...state,
						toastMessage: '',
						runningRemoveToast: O.none(),
					},
					[],
				),
			),
			M.when(
				{ _tag: 'RemoveToastStarted' },
				({ fiber }) =>
					Da.tuple(
						{
							...state,
							runningRemoveToast: O.some(fiber),
						},
						[],
					),
			),
			M.exhaustive,
		)
