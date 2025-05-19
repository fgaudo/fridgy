import { Da, Eff, M, NEHS, O } from '$lib/core/imports.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import type { GetSortedProductsDTO } from '$lib/business/app/use-cases/get-sorted-products.ts'
import type { Update } from '$lib/ui/adapters.ts'

import { deleteSelectedAndRefresh, refreshList } from './commands.ts'
import { type State } from './state.svelte.ts'

export type Message = Da.TaggedEnum<{
	FetchList: object
	FetchListSucceeded: {
		taskId: symbol
		result: GetSortedProductsDTO
	}
	FetchListFailed: { taskId: symbol }
	StartDeleteSelectedAndRefresh: { ids: NEHS.NonEmptyHashSet<string> }
	DeleteSelectedFailed: object
	DeleteSelectedSucceededButRefreshFailed: object
	DeleteSelectedAndRefreshSucceeded: {
		result: GetSortedProductsDTO
	}
	NoOp: object
	Crash: { message: unknown }
}>

export const Message = Da.taggedEnum<Message>()

export const update: Update<State, Message, UseCases> = (state, message) => {
	return M.type<Message>().pipe(
		M.tag(`FetchList`, () => {
			const taskId = Symbol()

			state.refreshingTaskId = taskId

			state.receivedError = false

			return [refreshList(taskId)]
		}),
		M.tag(`FetchListFailed`, ({ taskId }) => {
			if (taskId !== state.refreshingTaskId) {
				return [
					Eff.logWarning(`FetchListFailed is stale`).pipe(
						Eff.as(Message.NoOp()),
					),
				]
			}

			state.receivedError = true

			return []
		}),
		M.tag(`FetchListSucceeded`, ({ result, taskId }) => {
			if (taskId !== state.refreshingTaskId) {
				return [
					Eff.logWarning(`FetchListSucceeded is stale`).pipe(
						Eff.as(Message.NoOp()),
					),
				]
			}

			state.products = result.map(entry => {
				if (entry.isCorrupt) {
					return {
						...entry,
						maybeName: O.getOrUndefined(entry.maybeName),
						id: Symbol(),
					}
				}

				if (entry.isValid) {
					return {
						...entry,
						maybeExpirationDate: O.getOrUndefined(entry.maybeExpirationDate),
						isSelected: false,
					}
				}

				return {
					...entry,
					maybeName: O.getOrUndefined(entry.maybeName),
					maybeCreationDate: O.getOrUndefined(entry.maybeCreationDate),
					maybeExpirationDate: O.getOrUndefined(entry.maybeExpirationDate),
					isSelected: false,
				}
			})

			return []
		}),
		M.tag(`StartDeleteSelectedAndRefresh`, ({ ids }) => {
			if (state.isDeleteRunning) {
				return []
			}

			return [deleteSelectedAndRefresh(ids)]
		}),
		M.tag(`DeleteSelectedAndRefreshSucceeded`, ({ result }) => {
			state.isDeleteRunning = false
			state.products = result.map(entry => {
				if (entry.isCorrupt) {
					return {
						...entry,
						maybeName: O.getOrUndefined(entry.maybeName),
						id: Symbol(),
					}
				}

				if (entry.isValid) {
					return {
						...entry,
						maybeExpirationDate: O.getOrUndefined(entry.maybeExpirationDate),
						isSelected: false,
					}
				}

				return {
					...entry,
					maybeName: O.getOrUndefined(entry.maybeName),
					maybeCreationDate: O.getOrUndefined(entry.maybeCreationDate),
					maybeExpirationDate: O.getOrUndefined(entry.maybeExpirationDate),
					isSelected: false,
				}
			})

			return []
		}),
		M.tag(`DeleteSelectedFailed`, () => {
			state.isDeleteRunning = false

			return []
		}),
		M.tag(`DeleteSelectedSucceededButRefreshFailed`, () => {
			state.isDeleteRunning = false
			state.products = undefined

			return []
		}),
		M.tag(`NoOp`, () => []),
		M.tag(`Crash`, () => {
			state.hasCrashOccurred = true
			return []
		}),
		M.exhaustive,
	)(message)
}
