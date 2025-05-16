import { Cl, E, Eff, NEHS, pipe } from '$lib/core/imports.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import { DeleteProductsByIds, GetSortedProducts } from '$lib/business/index.ts'
import type { Command } from '$lib/ui/adapters.ts'

import type { FetchId } from './state.svelte.ts'
import { Message } from './update.svelte.ts'

type HomeCommand = Command<Message, UseCases>

export const refreshList: (taskid: FetchId) => HomeCommand = taskId =>
	Eff.gen(function* () {
		const getProducts = yield* GetSortedProducts.GetSortedProducts

		const result = yield* Eff.either(getProducts)

		if (E.isLeft(result)) {
			return Message.FetchListFailed({ taskId })
		}

		return Message.FetchListSucceeded({
			taskId,
			result: result.right,
		})
	})

export const refreshTime: HomeCommand = Eff.gen(function* () {
	const time = yield* Cl.currentTimeMillis
	return Message.RefreshTimeResult({
		timestamp: time,
	})
})

export const deleteSelectedAndRefresh: (
	ids: NEHS.NonEmptyHashSet<string>,
) => HomeCommand = ids =>
	Eff.gen(function* () {
		const deleteProducts = yield* DeleteProductsByIds.DeleteProductsByIds

		const deleteResult = yield* pipe(deleteProducts(ids), Eff.either)

		if (E.isLeft(deleteResult)) {
			return Message.DeleteSelectedFailed()
		}

		const refreshList = yield* GetSortedProducts.GetSortedProducts

		const refreshResult = yield* pipe(refreshList, Eff.either)

		if (E.isLeft(refreshResult)) {
			return Message.DeleteSelectedSucceededButRefreshFailed()
		}

		return Message.DeleteSelectedAndRefreshSucceeded({
			result: refreshResult.right,
		})
	})

export const queueLoading: (id: symbol) => HomeCommand = id =>
	Eff.gen(function* () {
		yield* Eff.sleep(`150 millis`)
		return Message.ShowSpinner({ id })
	})
