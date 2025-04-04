import { MINIMUM_LAG_MS } from '$lib/ui/core/constants.ts';
import type { Task } from '$lib/ui/core/solid.ts';

import {
	E,
	Eff,
	F,
	H,
	HS,
	NEHS,
	NETS,
	O,
} from '$lib/core/imports.ts';

import type { App } from '$lib/app/index.ts';
import { DeleteProductsByIdsUseCase } from '$lib/app/use-cases/delete-products-by-ids.ts';
import { GetSortedProductsUseCase } from '$lib/app/use-cases/get-sorted-products.ts';

import type { State } from './index.ts';
import { Message } from './messages.ts';

export const refreshList = (
	app: App,
): Task<State, Message> => ({
	onStart: (fiber: F.Fiber<unknown>) => () =>
		Message.RefreshListStarted({
			fiber,
		}),
	effect: ({
		isRunningRefresh: runningRefreshing,
	}: State) =>
		Eff.provide(
			Eff.gen(function* () {
				if (O.isSome(runningRefreshing)) {
					yield* F.interrupt(
						runningRefreshing.value,
					);
				}

				const refreshList =
					yield* GetSortedProductsUseCase;

				const [result] = yield* Eff.all([
					refreshList.pipe(Eff.either),
					Eff.sleep(MINIMUM_LAG_MS),
				]);

				if (E.isLeft(result)) {
					return Message.RefreshListFailed({
						message: NETS.unsafe_fromString(
							'There was a problem loading the list',
						),
					});
				}

				return Message.RefreshListSucceeded({
					total: result.right.total,
					models: result.right.models,
				});
			}),
			app,
		),
});

export const deleteByIdsAndRefresh = (
	app: App,
): Task<State, Message> => ({
	onStart: (fiber: F.Fiber<unknown>) => () =>
		Message.DeleteProductsAndRefreshStarted({
			fiber,
		}),
	effect: ({ selectedProducts }: State) =>
		Eff.provide(
			Eff.gen(function* () {
				const selected = NEHS.fromHashSet(
					selectedProducts,
				);
				if (O.isNone(selected)) {
					return Message.DeleteProductsFailed({
						message: NETS.unsafe_fromString(
							'No products provided',
						),
					});
				}
				const [deleteProducts, refreshList] =
					yield* Eff.all([
						DeleteProductsByIdsUseCase,
						GetSortedProductsUseCase,
					]);

				const [result] = yield* Eff.all([
					deleteProducts(selected.value).pipe(
						Eff.either,
					),
					Eff.sleep(MINIMUM_LAG_MS),
				]);

				if (E.isLeft(result)) {
					return Message.DeleteProductsFailed({
						message: NETS.unsafe_fromString(
							'There was a problem deleting the products',
						),
					});
				}

				const result2 = yield* refreshList.pipe(
					Eff.either,
				);

				if (E.isLeft(result2)) {
					yield* H.logError(result2.left);
					return Message.DeleteProductsSucceededAndRefreshFailed(
						{
							message: NETS.unsafe_fromString(
								`${HS.size(selectedProducts).toString(10)} deleted but couldn't refresh list`,
							),
						},
					);
				}

				return Message.DeleteProductsAndRefreshSucceeded(
					{
						deletedItems: NEHS.size(
							selected.value,
						),
						total: result2.right.total,
						models: result2.right.models,
					},
				);
			}),
			app,
		),
});

export const toggleItem = (
	id: string,
): Task<State, Message> => ({
	effect: () =>
		Eff.succeed(Message.ToggleItem({ id })),
});
