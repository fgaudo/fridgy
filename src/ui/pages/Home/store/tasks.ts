import {
	E,
	Eff,
	F,
	HS,
	Int,
	O,
} from '@/core/imports'

import type { App } from '@/app/index'

import { MINIMUM_LAG_MS } from '@/ui/core/constants'

import { InternalMessage } from './actions'

export const refreshListTask = (
	runningRefreshing: O.Option<F.Fiber<unknown>>,
	refreshList: App['productList'],
) =>
	({
		type: 'task',
		onStart: (fiber: F.Fiber<unknown>) =>
			InternalMessage.RefreshListStarted({
				fiber,
			}),

		effect: Eff.gen(function* () {
			if (O.isSome(runningRefreshing)) {
				yield* F.interrupt(
					runningRefreshing.value,
				)
			}

			const [result] = yield* Eff.all([
				refreshList.pipe(Eff.either),
				Eff.sleep(MINIMUM_LAG_MS),
			])

			if (E.isLeft(result)) {
				yield* Eff.logError(result.left)

				return yield* Eff.fail(
					InternalMessage.RefreshListFailed({
						message:
							'There was a problem loading the list',
					}),
				)
			}

			return InternalMessage.RefreshListSucceeded(
				{
					total: result.right.total,
					models: result.right.models,
				},
			)
		}),
	}) as const

export const deleteTask = (
	selectedProducts: HS.HashSet<string>,
	deleteProducts: App['deleteProductsByIds'],
	refreshList: App['productList'],
) =>
	({
		type: 'task',
		onStart: (fiber: F.Fiber<unknown>) =>
			InternalMessage.DeleteProductsAndRefreshStarted(
				{
					fiber,
				},
			),
		effect: Eff.gen(function* () {
			if (HS.size(selectedProducts) <= 0) {
				return yield* Eff.fail(
					InternalMessage.DeleteProductsFailed({
						message: 'No products selected',
					}),
				)
			}

			const [result] = yield* Eff.all([
				deleteProducts(selectedProducts).pipe(
					Eff.either,
				),
				Eff.sleep(MINIMUM_LAG_MS),
			])

			if (E.isLeft(result)) {
				yield* Eff.logError(result.left)
				return yield* Eff.fail(
					InternalMessage.DeleteProductsFailed({
						message:
							'There was a problem deleting the products',
					}),
				)
			}

			const result2 = yield* refreshList.pipe(
				Eff.either,
			)

			if (E.isLeft(result2)) {
				yield* Eff.logError(result2.left)
				return InternalMessage.DeleteProductsAndRefreshFailed(
					{
						message: `${HS.size(selectedProducts).toString(10)} deleted but couldn't refresh list`,
					},
				)
			}

			return InternalMessage.DeleteProductsAndRefreshSucceeded(
				{
					deletedItems: Int.unsafe_fromNumber(
						HS.size(selectedProducts),
					),
					total: result2.right.total,
					models: result2.right.models,
				},
			)
		}),
	}) as const

export const removeToast = (
	fiber: O.Option<F.Fiber<unknown>>,
) =>
	({
		type: 'task',
		onStart: (fiber: F.Fiber<unknown>) =>
			InternalMessage.RemoveToastStarted({
				fiber,
			}),
		effect: Eff.gen(function* () {
			if (O.isSome(fiber)) {
				yield* F.interrupt(fiber.value)
			}

			yield* Eff.sleep(3000)
			return InternalMessage.RemoveToast()
		}),
	}) as const
