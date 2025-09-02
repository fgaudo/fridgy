import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'

import * as NonEmptyHashSet from '$lib/core/non-empty-hash-set.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import { DeleteProductsByIds, GetSortedProducts } from '$lib/business/index.ts'
import type { Command } from '$lib/ui/helpers.svelte.ts'

import { Message } from './update.svelte.ts'

type HomeCommand = Command<Message, UseCases>

export const refreshList: (taskid: symbol) => HomeCommand = taskId =>
	Effect.gen(function* () {
		const getProducts = yield* GetSortedProducts.GetSortedProducts

		const result = yield* Effect.either(getProducts)

		if (Either.isLeft(result)) {
			return Message.FetchListFailed({ taskId })
		}

		return Message.FetchListSucceeded({
			taskId,
			result: result.right,
		})
	})

export const refreshTime: HomeCommand = Effect.gen(function* () {
	const time = yield* Clock.currentTimeMillis
	return Message.RefreshTimeResult({
		timestamp: time,
	})
})

export const deleteSelectedAndRefresh: (
	ids: NonEmptyHashSet.NonEmptyHashSet<string>,
) => HomeCommand = ids =>
	Effect.gen(function* () {
		const deleteProducts = yield* DeleteProductsByIds.DeleteProductsByIds

		const deleteResult = yield* pipe(deleteProducts(ids), Effect.either)

		if (Either.isLeft(deleteResult)) {
			return Message.DeleteSelectedFailed()
		}

		const refreshList = yield* GetSortedProducts.GetSortedProducts

		const refreshResult = yield* pipe(refreshList, Effect.either)

		if (Either.isLeft(refreshResult)) {
			return Message.DeleteSelectedSucceededButRefreshFailed()
		}

		return Message.DeleteSelectedAndRefreshSucceeded({
			result: refreshResult.right,
		})
	})

export const queueLoading: (id: symbol) => HomeCommand = id =>
	Effect.gen(function* () {
		yield* Effect.sleep(`150 millis`)
		return Message.ShowSpinner({ id })
	})

export const queueRemoveToast: (id: symbol) => HomeCommand = id =>
	Effect.gen(function* () {
		yield* Effect.logDebug(`Executed command to queue toast removal`)
		yield* Effect.sleep(`3 seconds`)
		return Message.RemoveToast({ id })
	})
