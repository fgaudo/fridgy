import { SvelteSet } from 'svelte/reactivity'

import { Da, M } from '$lib/core/imports.ts'
import { type Update } from '$lib/core/store.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import type { ProductsPage } from '$lib/business/app/use-cases/get-sorted-products.ts'

import {
	FetchId,
	type ProductViewModel,
	type State,
} from './state.svelte.ts'
import {
	deleteSelectedAndRefresh,
	refreshList,
	refreshTime,
} from './tasks.ts'

export type Message = Da.TaggedEnum<{
	FetchList: object
	FetchListSucceeded: {
		taskId: FetchId
		result: ProductsPage
	}
	FetchListFailed: { taskId: FetchId }
	ToggleMenu: object
	DisableSelectMode: object
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
}>

export const Message = Da.taggedEnum<Message>()

export const update: Update<
	State,
	Message,
	UseCases
> = (state, message) =>
	M.type<Message>().pipe(
		M.tag('RefreshTime', () => {
			return { state, tasks: [refreshTime] }
		}),
		M.tag('FetchList', () => {
			state.isLoading = true

			const taskId = FetchId()

			state.refreshingTaskId = taskId

			return {
				state,
				tasks: [refreshList(taskId)],
			}
		}),
		M.tag('FetchListFailed', ({ taskId }) => {
			if (taskId !== state.refreshingTaskId) {
				return { state }
			}
			state.receivedError = true
			state.isLoading = false

			return { state }
		}),
		M.tag(
			'FetchListSucceeded',
			({ result, taskId }) => {
				if (taskId !== state.refreshingTaskId) {
					return { state }
				}

				state.products = {
					entries: result.entries.map(entry => ({
						...entry,
						isSelected: false,
					})),
					selected: new SvelteSet(),
				}
				state.isLoading = false

				return { state }
			},
		),
		M.tag('DeleteSelectedAndRefresh', () => {
			if (state.deletingRunning) {
				return { state }
			}

			state.deletingRunning = true

			return {
				state,
				tasks: [deleteSelectedAndRefresh],
			}
		}),
		M.tag(
			'DeleteSelectedAndRefreshSucceeded',
			({ result }) => {
				state.deletingRunning = false
				state.products = {
					entries: result.entries.map(entry => ({
						...entry,
						isSelected: false,
					})),
					selected: new SvelteSet(),
				}
				state.isLoading = false
				state.products.selected.clear()

				return { state }
			},
		),
		M.tag('DeleteSelectedFailed', () => {
			state.deletingRunning = false
			state.isLoading = false

			return { state }
		}),
		M.tag(
			'DeleteSelectedSucceededButRefreshFailed',
			() => {
				state.deletingRunning = false
				state.products = undefined
				state.isLoading = false
				state.receivedError = true
				return { state }
			},
		),
		M.tag('DisableRefreshTimeListener', () => {
			state.refreshTimeListenersRegistered = false

			return { state }
		}),
		M.tag('EnableRefreshTimeListener', () => {
			state.refreshTimeListenersRegistered = true

			return { state }
		}),
		M.tag('DisableSelectMode', () => {
			if (state.products === undefined)
				return {
					state,
				}

			state.products.selected.clear()

			return { state }
		}),
		M.tag('ToggleItem', ({ product }) => {
			if (product.isCorrupt) {
				return { state }
			}

			if (state.products === undefined)
				return { state }

			if (
				state.products.selected.has(product.id)
			) {
				product.isSelected = false
				state.products.selected.delete(product.id)
				return { state }
			}

			state.products.selected.add(product.id)
			product.isSelected = true

			return { state }
		}),
		M.tag('ToggleMenu', () => {
			state.isMenuOpen = !state.isMenuOpen

			return { state }
		}),
		M.tag(
			'RefreshTimeResult',
			({ timestamp }) => {
				state.currentTimestamp = timestamp

				return { state }
			},
		),
		M.exhaustive,
	)(message)
