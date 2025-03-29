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

import type { App } from '@/app/index.ts'
import { DeleteProductsByIdsUseCase } from '@/app/use-cases/delete-products-by-ids.ts'
import { GetSortedProductsUseCase } from '@/app/use-cases/get-sorted-products.ts'

import { MINIMUM_LAG_MS } from '@/ui/core/constants.ts'
import type { Task } from '@/ui/core/solid.ts'

import { Message } from './actions.ts'
import type { State } from './index.ts'

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
					)
				}

				const refreshList =
					yield* GetSortedProductsUseCase

				const [result] = yield* Eff.all([
					refreshList.pipe(Eff.either),
					Eff.sleep(MINIMUM_LAG_MS),
				])

				if (E.isLeft(result)) {
					return Message.RefreshListFailed({
						message: NETS.unsafe_fromString(
							'There was a problem loading the list',
						),
					})
				}

				return Message.RefreshListSucceeded({
					total: result.right.total,
					models: result.right.models,
				})
			}),
			app,
		),
})

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
				)
				if (O.isNone(selected)) {
					return Message.DeleteProductsFailed({
						message: NETS.unsafe_fromString(
							'No products provided',
						),
					})
				}
				const [deleteProducts, refreshList] =
					yield* Eff.all([
						DeleteProductsByIdsUseCase,
						GetSortedProductsUseCase,
					])

				const [result] = yield* Eff.all([
					deleteProducts(selected.value).pipe(
						Eff.either,
					),
					Eff.sleep(MINIMUM_LAG_MS),
				])

				if (E.isLeft(result)) {
					return Message.DeleteProductsFailed({
						message: NETS.unsafe_fromString(
							'There was a problem deleting the products',
						),
					})
				}

				const result2 = yield* refreshList.pipe(
					Eff.either,
				)

				if (E.isLeft(result2)) {
					yield* H.logError(result2.left)
					return Message.DeleteProductsSucceededAndRefreshFailed(
						{
							message: NETS.unsafe_fromString(
								`${HS.size(selectedProducts).toString(10)} deleted but couldn't refresh list`,
							),
						},
					)
				}

				return Message.DeleteProductsAndRefreshSucceeded(
					{
						deletedItems: NEHS.size(
							selected.value,
						),
						total: result2.right.total,
						models: result2.right.models,
					},
				)
			}),
			app,
		),
})
