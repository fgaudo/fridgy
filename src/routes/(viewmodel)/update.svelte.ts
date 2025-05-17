import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { SvelteSet } from 'svelte/reactivity'

import { Da, Eff, HS, M, NEHS, O, pipe } from '$lib/core/imports.ts'

import type { GetSortedProductsDTO } from '$lib/business/app/use-cases/get-sorted-products.ts'
import type { Update } from '$lib/ui/adapters.ts'

import {
	deleteSelectedAndRefresh,
	queueLoading,
	refreshList,
	refreshTime,
	refreshTimeIntervalTick,
} from './commands.ts'
import {
	FetchId,
	type ProductViewModel,
	type StateContext,
} from './state.svelte.ts'

export type Message = Da.TaggedEnum<{
	FetchList: object
	FetchListSucceeded: {
		taskId: FetchId
		result: GetSortedProductsDTO
	}
	FetchListFailed: { taskId: FetchId }
	ClearSelected: object
	ToggleItem: {
		product: ProductViewModel
	}
	DeleteSelectedAndRefresh: object
	DeleteSelectedFailed: object
	DeleteSelectedSucceededButRefreshFailed: object
	DeleteSelectedAndRefreshSucceeded: {
		result: GetSortedProductsDTO
	}
	StartRefreshTime: object
	RefreshTimeIntervalTick: { timestamp: number }
	RefreshTimeResult: { timestamp: number }
	ShowSpinner: { id: symbol }
	NoOp: object
}>

export const Message = Da.taggedEnum<Message>()

export const update: Update<
	{ state: StateContext[`state`]; derived: StateContext[`derived`] },
	Message
> = (context, message) => {
	return M.type<Message>().pipe(
		M.tag(`StartRefreshTime`, () => {
			return [refreshTime]
		}),
		M.tag(`FetchList`, () => {
			const taskId = FetchId()

			context.state.refreshingTaskId = taskId
			context.state.isLoading = true

			return [refreshList(taskId)]
		}),
		M.tag(`FetchListFailed`, ({ taskId }) => {
			if (taskId !== context.state.refreshingTaskId) {
				return [
					Eff.logWarning(`FetchListFailed is stale`).pipe(
						Eff.as(Message.NoOp()),
					),
				]
			}

			context.state.isLoading = false
			context.state.receivedError = true

			return []
		}),
		M.tag(`FetchListSucceeded`, ({ result, taskId }) => {
			if (taskId !== context.state.refreshingTaskId) {
				return [
					Eff.logWarning(`FetchListSucceeded is stale`).pipe(
						Eff.as(Message.NoOp()),
					),
				]
			}
			context.state.isLoading = false

			context.state.products = {
				entries: result.map(entry => {
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
				}),
				selected: new SvelteSet(),
			}

			return []
		}),
		M.tag(`DeleteSelectedAndRefresh`, () => {
			if (context.state.isDeleteRunning) {
				return []
			}

			const maybeIds = pipe(
				O.fromNullable(context.state.products?.selected),
				O.map(HS.fromIterable),
				O.flatMap(NEHS.fromHashSet),
			)

			if (O.isNone(maybeIds)) {
				return []
			}

			const id = Symbol()
			context.state.spinnerTaskId = id
			context.state.isDeleteRunning = true

			return [deleteSelectedAndRefresh(maybeIds.value), queueLoading(id)]
		}),
		M.tag(`DeleteSelectedAndRefreshSucceeded`, ({ result }) => {
			context.state.isDeleteRunning = false
			context.state.products = {
				entries: result.map(entry => {
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
				}),
				selected: new SvelteSet(),
			}
			context.state.products.selected.clear()
			context.state.isLoading = false
			context.state.spinnerTaskId = undefined

			return []
		}),
		M.tag(`DeleteSelectedFailed`, () => {
			context.state.isDeleteRunning = false
			context.state.isLoading = false
			context.state.spinnerTaskId = undefined

			return []
		}),
		M.tag(`DeleteSelectedSucceededButRefreshFailed`, () => {
			context.state.isDeleteRunning = false
			context.state.products = undefined
			context.state.receivedError = true
			context.state.spinnerTaskId = undefined

			context.state.isLoading = false

			return []
		}),
		M.tag(`ClearSelected`, () => {
			if (context.state.products === undefined) return []

			context.state.products.selected.clear()
			context.state.products.entries.forEach(entry => {
				if (entry.isCorrupt) return
				entry.isSelected = false
			})
			return []
		}),
		M.tag(`ToggleItem`, ({ product }) => {
			if (context.state.isDeleteRunning) return []

			if (product.isCorrupt) {
				return []
			}

			if (context.state.products === undefined) return []

			const hasSelectionStarted = context.state.products.selected.size <= 0

			if (context.state.products.selected.has(product.id)) {
				product.isSelected = false
				context.state.products.selected.delete(product.id)
				return []
			}

			context.state.products.selected.add(product.id)
			product.isSelected = true

			return [
				...(hasSelectionStarted
					? [
							Eff.promise(() =>
								Haptics.impact({
									style: ImpactStyle.Light,
								}),
							).pipe(Eff.as(Message.NoOp())),
						]
					: []),
			]
		}),
		M.tag(`RefreshTimeResult`, ({ timestamp }) => {
			context.state.currentTimestamp = timestamp

			return []
		}),
		M.tag(`ShowSpinner`, ({ id }) => {
			if (id !== context.state.spinnerTaskId) {
				return [
					Eff.logWarning(`ShowSpinner is stale`).pipe(Eff.as(Message.NoOp())),
				]
			}
			context.state.isLoading = true
			return []
		}),
		M.tag(`RefreshTimeIntervalTick`, () => {
			if (context.derived.refreshTimeListenersEnabled)
				return [refreshTimeIntervalTick]

			return []
		}),
		M.tag(`NoOp`, () => []),
		M.exhaustive,
	)(message)
}
