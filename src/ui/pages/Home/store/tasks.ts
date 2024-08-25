import {
	E,
	Eff,
	F,
	HS,
	Int,
	NETS,
	O,
} from '@/core/imports'

import type { App } from '@/app/index'

import { MINIMUM_LAG_MS } from '@/ui/core/constants'
import type { Task } from '@/ui/core/solid-js'

import {
	InternalMessage,
	Message,
} from './actions'

export const refreshList = (
	runningRefreshing: O.Option<F.Fiber<unknown>>,
	refreshList: App['productList'],
) => ({
	onStart: (fiber: F.Fiber<unknown>) =>
		InternalMessage.RefreshListStarted({
			fiber,
		}),
	effect: Eff.gen(function* () {
		if (O.isSome(runningRefreshing)) {
			yield* F.interrupt(runningRefreshing.value)
		}

		const [result] = yield* Eff.all([
			refreshList.pipe(Eff.either),
			Eff.sleep(MINIMUM_LAG_MS),
		])

		if (E.isLeft(result)) {
			yield* Eff.logError(result.left)

			return InternalMessage.RefreshListFailed({
				message: NETS.unsafe_fromString(
					'There was a problem loading the list',
				),
			})
		}

		return InternalMessage.RefreshListSucceeded({
			total: result.right.total,
			models: result.right.models,
		})
	}),
})

export const deleteByIdsAndRefresh = (
	selectedProducts: HS.HashSet<string>,
	deleteProducts: App['deleteProductsByIds'],
	refreshList: App['productList'],
): Task<Message | InternalMessage> => ({
	onStart: (fiber: F.Fiber<unknown>) =>
		InternalMessage.DeleteProductsAndRefreshStarted(
			{ fiber },
		),
	effect: Eff.gen(function* () {
		if (HS.size(selectedProducts) <= 0) {
			return InternalMessage.DeleteProductsFailed(
				{
					message: NETS.unsafe_fromString(
						'No products selected',
					),
				},
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
			yield* Eff.logError(result2.left)
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
				deletedItems: Int.unsafe_fromNumber(
					HS.size(selectedProducts),
				),
				total: result2.right.total,
				models: result2.right.models,
			},
		)
	}),
})
