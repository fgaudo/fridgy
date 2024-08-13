import type { FiberId } from 'effect/FiberId'

import {
	E,
	Eff,
	FId,
	HS,
	O,
} from '@/core/imports'

import type { App } from '@/app/index'

import { DEFAULT_FADE_MS } from '@/ui/core/constants'

import { InternalMessage } from './actions'

export const refreshListTask = (
	refreshingId: O.Option<FiberId>,
	refreshList: App['productList'],
) =>
	({
		type: 'task',
		onStart: (id: FId.FiberId) =>
			InternalMessage.RefreshListStarted({
				id,
			}),

		effect: Eff.gen(function* () {
			if (O.isSome(refreshingId)) {
				yield* Eff.interruptWith(
					refreshingId.value,
				)
			}

			const result = yield* refreshList.pipe(
				Eff.either,
			)

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
					data: {
						total: result.right.total,
						models: result.right.models,
					},
				},
			)
		}),
	}) as const

export const deleteTask = (
	selectedProducts: HS.HashSet<string>,
	deleteProducts: App['deleteProductsByIds'],
) =>
	({
		type: 'task',
		onStart: (id: FId.FiberId) =>
			InternalMessage.RefreshListStarted({
				id,
			}),
		effect: Eff.gen(function* () {
			if (HS.size(selectedProducts) <= 0) {
				return yield* Eff.fail(
					InternalMessage.DeleteProductsFailed({
						message: 'No products selected',
					}),
				)
			}

			yield* Eff.sleep(DEFAULT_FADE_MS)

			const result = yield* deleteProducts(
				selectedProducts,
			).pipe(Eff.either)

			if (E.isLeft(result)) {
				yield* Eff.logError(result.left)
				return yield* Eff.fail(
					InternalMessage.DeleteProductsFailed({
						message:
							'There was a problem deleting the products',
					}),
				)
			}

			return InternalMessage.DeleteProductsSucceeded()
		}),
	}) as const
