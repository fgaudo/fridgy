import {
	E,
	Eff,
	F,
	H,
	HS,
	NEHS,
	NETS,
	O,
} from '@/core/imports.ts'
import type { NonEmptyHashSet } from '@/core/non-empty-hash-set.ts'

import type { App } from '@/app/index.ts'
import { DeleteProductsByIdsUseCase } from '@/app/use-cases/delete-products-by-ids.ts'
import { GetSortedProductsUseCase } from '@/app/use-cases/get-sorted-products.ts'

import { MINIMUM_LAG_MS } from '@/ui/core/constants.ts'
import type { Task } from '@/ui/core/solid.ts'

import {
	InternalMessage,
	Message,
} from './actions.ts'

export const refreshList = (
	runningRefreshing: O.Option<F.Fiber<unknown>>,
	app: App,
) => ({
	onStart: (fiber: F.Fiber<unknown>) =>
		InternalMessage.RefreshListStarted({
			fiber,
		}),
	effect: Eff.provide(
		Eff.gen(function* () {
			if (O.isSome(runningRefreshing)) {
				yield* F.interrupt(
					runningRefreshing.value,
				)
			}

			const refreshList =
				yield* GetSortedProductsUseCase

			const [result] = yield* Eff.all([
				refreshList.pipe(Eff.either),
				Eff.sleep(MINIMUM_LAG_MS),
			])

			if (E.isLeft(result)) {
				return InternalMessage.RefreshListFailed({
					message: NETS.unsafe_fromString(
						'There was a problem loading the list',
					),
				})
			}

			return InternalMessage.RefreshListSucceeded(
				{
					total: result.right.total,
					models: result.right.models,
				},
			)
		}),
		app,
	),
})

export const deleteByIdsAndRefresh = (
	selectedProducts: NonEmptyHashSet<string>,
	app: App,
): Task<Message | InternalMessage> => ({
	onStart: (fiber: F.Fiber<unknown>) =>
		InternalMessage.DeleteProductsAndRefreshStarted(
			{ fiber },
		),
	effect: Eff.provide(
		Eff.gen(function* () {
			const [deleteProducts, refreshList] =
				yield* Eff.all([
					DeleteProductsByIdsUseCase,
					GetSortedProductsUseCase,
				])

			const [result] = yield* Eff.all([
				deleteProducts(selectedProducts).pipe(
					Eff.either,
				),
				Eff.sleep(MINIMUM_LAG_MS),
			])

			if (E.isLeft(result)) {
				return InternalMessage.DeleteProductsFailed(
					{
						message: NETS.unsafe_fromString(
							'There was a problem deleting the products',
						),
					},
				)
			}

			const result2 = yield* refreshList.pipe(
				Eff.either,
			)

			if (E.isLeft(result2)) {
				yield* H.logError(result2.left)
				return InternalMessage.DeleteProductsSucceededAndRefreshFailed(
					{
						message: NETS.unsafe_fromString(
							`${HS.size(selectedProducts).toString(10)} deleted but couldn't refresh list`,
						),
					},
				)
			}

			return InternalMessage.DeleteProductsAndRefreshSucceeded(
				{
					deletedItems: NEHS.size(
						selectedProducts,
					),
					total: result2.right.total,
					models: result2.right.models,
				},
			)
		}),
		app,
	),
})
