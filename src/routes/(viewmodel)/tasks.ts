import {
	Cl,
	E,
	Eff,
	HS,
	NEHS,
	O,
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

export const deleteSelectedAndRefresh: HomeTask =
	Eff.gen(function* () {
		const store = yield* Store.Service

		const deleteProducts =
			yield* DeleteProductsByIds.DeleteProductsByIds

		let state = yield* store.getSnapshot

		const maybeIds = pipe(
			HS.fromIterable(
				state.productsState.selected,
			),
			NEHS.fromHashSet,
		)

		if (O.isNone(maybeIds)) {
			return
		}

		state = yield* store.dispatch({
			type: 'deleteSelectedAndRefreshStarted',
		})

		const deleteResult = yield* pipe(
			deleteProducts(maybeIds.value),
			Eff.either,
		)

		if (E.isLeft(deleteResult)) {
			return yield* store.dispatch({
				type: 'deleteSelectedFailed',
			})
		}

		const refreshList =
			yield* GetSortedProducts.GetSortedProducts

		const refreshResult = yield* pipe(
			refreshList,
			Eff.either,
		)

		if (E.isLeft(refreshResult)) {
			return yield* store.dispatch({
				type: 'deleteSelectedSuccededAndRefreshFailed',
			})
		}

		yield* store.dispatch({
			type: 'deleteSelectedAndRefreshSucceeded',
			param: refreshResult.right,
		})
	})
