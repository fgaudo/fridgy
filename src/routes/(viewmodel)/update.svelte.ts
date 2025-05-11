import { SvelteSet } from 'svelte/reactivity'

import {
	Da,
	HS,
	M,
	NEHS,
	O,
	pipe,
} from '$lib/core/imports.ts'
import { type Update } from '$lib/core/store.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import type { ProductsPage } from '$lib/business/app/use-cases/get-sorted-products.ts'

import {
	deleteSelectedAndRefresh,
	queueLoading,
	refreshList,
	refreshTime,
} from './commands.ts'
import {
	FetchId,
	type ProductViewModel,
	type State,
} from './state.svelte.ts'

export type Message = Da.TaggedEnum<{
	FetchList: object
	FetchListSucceeded: {
		taskId: FetchId
		result: ProductsPage
	}
	FetchListFailed: { taskId: FetchId }
	ToggleMenu: object
	ClearSelected: object
	ToggleItem: {
		product: ProductViewModel
	}
	EnableRefreshTimeListener: object
	DisableRefreshTimeListener: object
	DeleteSelectedAndRefresh: object
	DeleteSelectedFailed: object
	DeleteSelectedSucceededButRefreshFailed: object
	DeleteSelectedAndRefreshSucceeded: {
		result: ProductsPage
	}
	RefreshTime: object
	RefreshTimeResult: { timestamp: number }
	ShowSpinner: { id: symbol }
}>

export const Message = Da.taggedEnum<Message>()

export const update: Update<
	State,
	Message,
	UseCases
> = (state, message) => {
	return M.type<Message>().pipe(
		M.tag('RefreshTime', () => {
			return { state, commands: [refreshTime] }
		}),
		M.tag('FetchList', () => {
			const taskId = FetchId()

			state.refreshingTaskId = taskId

			return {
				state,
				commands: [refreshList(taskId)],
			}
		}),
		M.tag('FetchListFailed', ({ taskId }) => {
			if (taskId !== state.refreshingTaskId) {
				return { state, commands: [] }
			}
			state.receivedError = true

			return { state, commands: [] }
		}),
		M.tag(
			'FetchListSucceeded',
			({ result, taskId }) => {
				if (taskId !== state.refreshingTaskId) {
					return { state, commands: [] }
				}

				state.products = {
					entries: result.entries.map(entry => {
						if (entry.isCorrupt) {
							return { ...entry, id: Symbol() }
						}

						return {
							...entry,
							isSelected: false,
						}
					}),
					selected: new SvelteSet(),
				}

				return { state, commands: [] }
			},
		),
		M.tag('DeleteSelectedAndRefresh', () => {
			if (state.isDeleteRunning) {
				return { state, commands: [] }
			}

			const maybeIds = pipe(
				O.fromNullable(state.products?.selected),
				O.map(HS.fromIterable),
				O.flatMap(NEHS.make),
			)

			if (O.isNone(maybeIds)) {
				return { state, commands: [] }
			}

			const id = Symbol()
			state.spinnerTaskId = id
			state.isDeleteRunning = true

			return {
				state,
				commands: [
					deleteSelectedAndRefresh(
						maybeIds.value,
					),
					queueLoading(id),
				],
			}
		}),
		M.tag(
			'DeleteSelectedAndRefreshSucceeded',
			({ result }) => {
				state.isDeleteRunning = false
				state.products = {
					entries: result.entries.map(entry => {
						if (entry.isCorrupt)
							return {
								...entry,
								id: Symbol(),
							}

						return {
							...entry,
							isSelected: false,
						}
					}),
					selected: new SvelteSet(),
				}
				state.products.selected.clear()
				state.isLoading = false
				state.spinnerTaskId = undefined

				return { state, commands: [] }
			},
		),
		M.tag('DeleteSelectedFailed', () => {
			state.isDeleteRunning = false
			state.isLoading = false
			state.spinnerTaskId = undefined

			return { state, commands: [] }
		}),
		M.tag(
			'DeleteSelectedSucceededButRefreshFailed',
			() => {
				state.isDeleteRunning = false
				state.products = undefined
				state.receivedError = true
				state.spinnerTaskId = undefined

				state.isLoading = false

				return { state, commands: [] }
			},
		),
		M.tag('DisableRefreshTimeListener', () => {
			state.refreshTimeListenersRegistered = false

			return { state, commands: [] }
		}),
		M.tag('EnableRefreshTimeListener', () => {
			state.refreshTimeListenersRegistered = true

			return { state, commands: [] }
		}),
		M.tag('ClearSelected', () => {
			if (state.products === undefined)
				return { state, commands: [] }

			state.products.selected.clear()
			state.products.entries.forEach(entry => {
				if (entry.isCorrupt) return
				entry.isSelected = false
			})
			return { state, commands: [] }
		}),
		M.tag('ToggleItem', ({ product }) => {
			if (product.isCorrupt) {
				return { state, commands: [] }
			}

			if (state.products === undefined)
				return { state, commands: [] }

			if (
				state.products.selected.has(product.id)
			) {
				product.isSelected = false
				state.products.selected.delete(product.id)
				return { state, commands: [] }
			}

			state.products.selected.add(product.id)
			product.isSelected = true

			return { state, commands: [] }
		}),
		M.tag('ToggleMenu', () => {
			state.isMenuOpen = !state.isMenuOpen

			return { state, commands: [] }
		}),
		M.tag(
			'RefreshTimeResult',
			({ timestamp }) => {
				state.currentTimestamp = timestamp

				return { state, commands: [] }
			},
		),
		M.tag('ShowSpinner', ({ id }) => {
			if (id !== state.spinnerTaskId) {
				return { state, commands: [] }
			}
			state.isLoading = true
			return { state, commands: [] }
		}),
		M.exhaustive,
	)(message)
}
