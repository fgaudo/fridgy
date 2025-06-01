import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { SvelteSet } from 'svelte/reactivity'

import { Da, Eff, HS, M, NEHS, O, pipe } from '$lib/core/imports.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import type { GetSortedProductsDTO } from '$lib/business/app/use-cases/get-sorted-products.ts'
import type { Update } from '$lib/ui/helpers.svelte.ts'

import {
	deleteSelectedAndRefresh,
	queueLoading,
	queueRemoveToast,
	refreshList,
	refreshTime,
} from './commands.ts'
import { type ProductViewModel, type State } from './state.svelte.ts'

export type Message = Da.TaggedEnum<{
	FetchList: object
	FetchListSucceeded: {
		taskId: symbol
		result: GetSortedProductsDTO
	}
	FetchListFailed: { taskId: symbol }
	ClearSelected: object
	ToggleItem: {
		product: ProductViewModel
	}
	StartDeleteSelectedAndRefresh: object
	DeleteSelectedFailed: object
	DeleteSelectedSucceededButRefreshFailed: object
	DeleteSelectedAndRefreshSucceeded: {
		result: GetSortedProductsDTO
	}
	StartRefreshTime: object
	RefreshTimeResult: { timestamp: number }
	ShowSpinner: { id: symbol }
	NoOp: object
	ToggleMenu: object
	ShowCrash: object
	RemoveToast: { id: symbol }
	Crash: { message: unknown }
}>

export const Message = Da.taggedEnum<Message>()

export const update: Update<State, Message, UseCases> = (state, message) => {
	return M.type<Message>().pipe(
		M.tag(`StartRefreshTime`, () => {
			return [refreshTime]
		}),
		M.tag(`FetchList`, () => {
			const taskId = Symbol()

			state.refreshingTaskId = taskId
			state.isLoading = true

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

			state.isLoading = false
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
			state.isLoading = false
			state.receivedError = false

			state.products = {
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
		M.tag(`StartDeleteSelectedAndRefresh`, () => {
			if (state.isDeleteRunning) {
				return []
			}

			const maybeIds = pipe(
				O.fromNullable(state.products?.selected),
				O.map(HS.fromIterable),
				O.flatMap(NEHS.fromHashSet),
			)

			if (O.isNone(maybeIds)) {
				return []
			}

			const id = Symbol()
			state.spinnerTaskId = id

			return [deleteSelectedAndRefresh(maybeIds.value), queueLoading(id)]
		}),
		M.tag(`DeleteSelectedAndRefreshSucceeded`, ({ result }) => {
			state.isDeleteRunning = false
			state.products = {
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
			state.products.selected.clear()
			state.isLoading = false
			state.spinnerTaskId = undefined

			return []
		}),
		M.tag(`DeleteSelectedFailed`, () => {
			state.isDeleteRunning = false
			state.isLoading = false
			state.spinnerTaskId = undefined

			return []
		}),
		M.tag(`DeleteSelectedSucceededButRefreshFailed`, () => {
			state.isDeleteRunning = false
			state.products = undefined
			state.receivedError = true
			state.spinnerTaskId = undefined

			state.isLoading = false

			return []
		}),
		M.tag(`ClearSelected`, () => {
			if (state.products === undefined) return []

			state.products.selected.clear()
			state.products.entries.forEach(entry => {
				if (entry.isCorrupt) return
				entry.isSelected = false
			})
			return []
		}),
		M.tag(`ToggleItem`, ({ product }) => {
			if (state.isDeleteRunning) return []

			if (product.isCorrupt) {
				return []
			}

			if (state.products === undefined) return []

			const hasSelectionStarted = state.products.selected.size <= 0

			if (state.products.selected.has(product.id)) {
				product.isSelected = false
				state.products.selected.delete(product.id)
				return []
			}

			state.products.selected.add(product.id)
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
			state.currentTimestamp = timestamp

			return []
		}),
		M.tag(`ShowSpinner`, ({ id }) => {
			if (id !== state.spinnerTaskId) {
				return [
					Eff.logWarning(`ShowSpinner is stale`).pipe(Eff.as(Message.NoOp())),
				]
			}
			state.isLoading = true
			return []
		}),
		M.tag(`RemoveToast`, ({ id }) => {
			if (id !== state.toastMessage?.id) {
				return [
					Eff.logWarning(`RemoveToast is stale`).pipe(Eff.as(Message.NoOp())),
				]
			}

			state.toastMessage = undefined

			return []
		}),
		M.tag(`ShowCrash`, () => {
			const id = Symbol()
			state.toastMessage = {
				message: `An unexpected error occurred and the app had to be reloaded`,
				id,
				type: `error`,
			}

			return [queueRemoveToast(id)]
		}),
		M.tag(`ToggleMenu`, () => {
			state.isMenuOpen = !state.isMenuOpen

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
