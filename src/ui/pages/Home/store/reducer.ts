import { type Reducer } from '$lib/ui/core/solid.ts';
import {
	produce,
	reconcile,
	unwrap,
} from 'solid-js/store';

import {
	Da,
	HS,
	M,
	NETS,
	O,
	pipe,
} from '$lib/core/imports.ts';

import type { App } from '$lib/app/index.ts';

import type { State } from './index.ts';
import { Message } from './messages.ts';
import * as Ta from './tasks.ts';

export const reducer: (
	app: App,
) => Reducer<State, Message> = app => msg =>
	pipe(
		M.value(msg),
		M.when({ _tag: 'RefreshList' }, () =>
			Da.tuple(
				produce((state: State) => {
					state.isRunningRefresh = O.none();
					state.message = O.none();
				}),
				HS.make(Ta.refreshList(app)),
			),
		),
		M.when({ _tag: 'DisableSelectMode' }, () =>
			Da.tuple(
				produce((state: State) => {
					state.selectedProducts = HS.empty();
				}),
				HS.empty(),
			),
		),
		M.when({ _tag: 'ToggleItem' }, ({ id }) =>
			Da.tuple(
				produce((state: State) => {
					state.selectedProducts = HS.toggle(id)(
						state.selectedProducts,
					);
				}),
				HS.empty(),
			),
		),
		M.when(
			{ _tag: 'DeleteProductsAndRefresh' },
			() =>
				Da.tuple(
					(state: State) => state,
					HS.make(Ta.deleteByIdsAndRefresh(app)),
				),
		),
		M.when(
			{ _tag: 'RefreshListSucceeded' },
			({ total, models }) =>
				Da.tuple(
					produce((state: State) => {
						state.isLoading = false;
						state.receivedError = false;
						state.isRunningRefresh = O.none();
						state.products = reconcile(models, {
							key: 'id',
						})(unwrap(state.products));
						state.total = total;
					}),
					HS.empty(),
				),
		),
		M.when(
			{ _tag: 'RefreshListStarted' },
			({ fiber }) =>
				Da.tuple(
					produce((state: State) => {
						state.isRunningRefresh =
							O.some(fiber);
					}),
					HS.empty(),
				),
		),
		M.when(
			{ _tag: 'RefreshListFailed' },
			({ message }) =>
				Da.tuple(
					produce((state: State) => {
						state.isLoading = false;
						state.products = [];
						state.receivedError = true;
						state.isRunningRefresh = O.none();
						state.message = O.some({
							type: 'error',
							text: message,
						} as const);
					}),
					HS.empty(),
				),
		),
		M.when(
			{ _tag: 'DeleteProductsFailed' },
			({ message }) =>
				Da.tuple(
					produce((state: State) => {
						state.isRunningDelete = O.none();
						state.message = O.some({
							type: 'error',
							text: message,
						} as const);
					}),
					HS.empty(),
				),
		),
		M.when(
			{
				_tag: 'DeleteProductsSucceededAndRefreshFailed',
			},
			({ message }) =>
				Da.tuple(
					produce((state: State) => {
						state.selectedProducts = HS.empty();
						state.products = [];
						state.receivedError = true;
						state.isRunningDelete = O.none();
						state.message = O.some({
							type: 'error',
							text: message,
						} as const);
					}),
					HS.empty(),
				),
		),
		M.when(
			{
				_tag: 'DeleteProductsAndRefreshSucceeded',
			},
			({ deletedItems, total, models }) =>
				Da.tuple(
					produce((state: State) => {
						state.selectedProducts = HS.empty();

						state.isRunningDelete = O.none();

						state.products = reconcile(models, {
							key: 'id',
						})(unwrap(state.products));

						state.total = total;

						state.message = O.some({
							type: 'success',
							text: NETS.unsafe_fromString(
								`${deletedItems.toString(10)} products deleted`,
							),
						} as const);
					}),
					HS.empty(),
				),
		),
		M.when(
			{
				_tag: 'DeleteProductsAndRefreshStarted',
			},
			({ fiber }) =>
				Da.tuple(
					produce((state: State) => {
						state.isRunningDelete = O.some(fiber);
					}),
					HS.empty(),
				),
		),
		M.when(
			{
				_tag: 'OpenAddProductPage',
			},
			() =>
				Da.tuple(
					(state: State) => state,
					HS.empty(),
				),
		),

		M.exhaustive,
	);
