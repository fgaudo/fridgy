import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'

import type { UseCases } from '../../business/app/use-cases.ts'
import { DeleteProductsByIds, GetSortedProducts } from '../../business/index.ts'
import * as NonEmptyHashSet from '../../core/non-empty-hash-set.ts'
import type { Command } from '../../core/state-manager.ts'
import { InternalMessage } from './update.ts'

type HomeCommand = Command<InternalMessage, UseCases>

export const refreshList: (taskid: symbol) => HomeCommand = Effect.fn(
	function* (taskId) {
		const getProducts = yield* GetSortedProducts.GetSortedProducts

		const result = yield* Effect.either(getProducts)

		if (Either.isLeft(result)) {
			return InternalMessage.FetchListFailed({ taskId })
		}

		return InternalMessage.FetchListSucceeded({
			taskId,
			result: result.right,
		})
	},
)

export const deleteSelectedAndRefresh: (
	ids: NonEmptyHashSet.NonEmptyHashSet<string>,
) => HomeCommand = Effect.fn(function* (ids) {
	const deleteProducts = yield* DeleteProductsByIds.DeleteProductsByIds

	const deleteResult = yield* pipe(deleteProducts(ids), Effect.either)

	if (Either.isLeft(deleteResult)) {
		return InternalMessage.DeleteFailed()
	}

	const refreshList = yield* GetSortedProducts.GetSortedProducts

	const refreshResult = yield* pipe(refreshList, Effect.either)

	if (Either.isLeft(refreshResult)) {
		return InternalMessage.DeleteSucceededButRefreshFailed()
	}

	return InternalMessage.DeleteAndRefreshSucceeded({
		result: refreshResult.right,
	})
})
