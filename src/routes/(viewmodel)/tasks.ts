import {
	Cl,
	E,
	Eff,
	NEHS,
	pipe,
} from '$lib/core/imports.ts'
import type { Task } from '$lib/core/store.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import {
	DeleteProductsByIds,
	GetSortedProducts,
} from '$lib/business/index.ts'

import type { FetchId } from './state.svelte.ts'
import { Message } from './update.svelte.ts'

type HomeTask = Task<Message, UseCases>

export const refreshList: (
	taskid: FetchId,
) => HomeTask = taskId =>
	Eff.gen(function* () {
		const getProducts =
			yield* GetSortedProducts.GetSortedProducts

		const result = yield* Eff.either(getProducts)

		if (E.isLeft(result)) {
			return [Message.FetchListFailed({ taskId })]
		}

		return [
			Message.FetchListSucceeded({
				taskId,
				result: result.right,
			}),
		]
	})

export const refreshTime: HomeTask = Eff.gen(
	function* () {
		const time = yield* Cl.currentTimeMillis
		return [
			Message.RefreshTimeResult({
				timestamp: time,
			}),
		]
	},
)

export const deleteSelectedAndRefresh: (
	ids: NEHS.NonEmptyHashSet<string>,
) => HomeTask = ids =>
	Eff.gen(function* () {
		const deleteProducts =
			yield* DeleteProductsByIds.DeleteProductsByIds

		const deleteResult = yield* pipe(
			deleteProducts(ids),
			Eff.either,
		)

		if (E.isLeft(deleteResult)) {
			return [Message.DeleteSelectedFailed()]
		}

		const refreshList =
			yield* GetSortedProducts.GetSortedProducts

		const refreshResult = yield* pipe(
			refreshList,
			Eff.either,
		)

		if (E.isLeft(refreshResult)) {
			return [
				Message.DeleteSelectedSucceededButRefreshFailed(),
			]
		}

		return [
			Message.DeleteSelectedAndRefreshSucceeded({
				result: refreshResult.right,
			}),
		]
	})
