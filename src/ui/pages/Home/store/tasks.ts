import { E, Eff, F, HS, O } from '@/core/imports'

import type { App } from '@/app/index'

import { DEFAULT_FADE_MS } from '@/ui/core/constants'

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
