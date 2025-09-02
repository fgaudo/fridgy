import { Haptics, ImpactStyle } from '@capacitor/haptics'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import { SvelteSet } from 'svelte/reactivity'

import * as NonEmptyHashSet from '$lib/core/non-empty-hash-set.ts'

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

export type Message = Data.TaggedEnum<{
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

export const Message = Data.taggedEnum<Message>()

export const update: Update<State, Message, UseCases> = (state, message) => {
	return Match.type<Message>().pipe(
		Match.tag(`StartRefreshTime`, () => {
			return [refreshTime]
		}),
		Match.tag(`FetchList`, () => {
			const taskId = Symbol()

			state.refreshingTaskId = taskId
			state.isLoading = true

			return [refreshList(taskId)]
		}),
		Match.tag(`FetchListFailed`, ({ taskId }) => {
			if (taskId !== state.refreshingTaskId) {
				return [
					Effect.logWarning(`FetchListFailed is stale`).pipe(
						Effect.as(Message.NoOp()),
					),
				]
			}

			state.isLoading = false
			state.receivedError = true

			return []
		}),
		Match.tag(`FetchListSucceeded`, ({ result, taskId }) => {
			if (taskId !== state.refreshingTaskId) {
				return [
					Effect.logWarning(`FetchListSucceeded is stale`).pipe(
						Effect.as(Message.NoOp()),
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
							maybeName: Option.getOrUndefined(entry.maybeName),
							id: Symbol(),
						}
					}

					if (entry.isValid) {
						return {
							...entry,
							maybeExpirationDate: Option.getOrUndefined(
								entry.maybeExpirationDate,
							),
							isSelected: false,
						}
					}

					return {
						...entry,
						maybeName: Option.getOrUndefined(entry.maybeName),
						maybeCreationDate: Option.getOrUndefined(entry.maybeCreationDate),
						maybeExpirationDate: Option.getOrUndefined(
							entry.maybeExpirationDate,
						),
						isSelected: false,
					}
				}),
				selected: new SvelteSet(),
			}

			return []
		}),
		Match.tag(`StartDeleteSelectedAndRefresh`, () => {
			if (state.isDeleteRunning) {
				return []
			}

			const maybeIds = pipe(
				Option.fromNullable(state.products?.selected),
				Option.map(HashSet.fromIterable),
				Option.flatMap(NonEmptyHashSet.fromHashSet),
			)

			if (Option.isNone(maybeIds)) {
				return []
			}

			const id = Symbol()
			state.spinnerTaskId = id

			return [deleteSelectedAndRefresh(maybeIds.value), queueLoading(id)]
		}),
		Match.tag(`DeleteSelectedAndRefreshSucceeded`, ({ result }) => {
			state.isDeleteRunning = false
			state.products = {
				entries: result.map(entry => {
					if (entry.isCorrupt) {
						return {
							...entry,
							maybeName: Option.getOrUndefined(entry.maybeName),
							id: Symbol(),
						}
					}

					if (entry.isValid) {
						return {
							...entry,
							maybeExpirationDate: Option.getOrUndefined(
								entry.maybeExpirationDate,
							),
							isSelected: false,
						}
					}

					return {
						...entry,
						maybeName: Option.getOrUndefined(entry.maybeName),
						maybeCreationDate: Option.getOrUndefined(entry.maybeCreationDate),
						maybeExpirationDate: Option.getOrUndefined(
							entry.maybeExpirationDate,
						),
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
		Match.tag(`DeleteSelectedFailed`, () => {
			state.isDeleteRunning = false
			state.isLoading = false
			state.spinnerTaskId = undefined

			return []
		}),
		Match.tag(`DeleteSelectedSucceededButRefreshFailed`, () => {
			state.isDeleteRunning = false
			state.products = undefined
			state.receivedError = true
			state.spinnerTaskId = undefined

			state.isLoading = false

			return []
		}),
		Match.tag(`ClearSelected`, () => {
			if (state.products === undefined) return []

			state.products.selected.clear()
			state.products.entries.forEach(entry => {
				if (entry.isCorrupt) return
				entry.isSelected = false
			})
			return []
		}),
		Match.tag(`ToggleItem`, ({ product }) => {
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
							Effect.promise(() =>
								Haptics.impact({
									style: ImpactStyle.Light,
								}),
							).pipe(Effect.as(Message.NoOp())),
						]
					: []),
			]
		}),
		Match.tag(`RefreshTimeResult`, ({ timestamp }) => {
			state.currentTimestamp = timestamp

			return []
		}),
		Match.tag(`ShowSpinner`, ({ id }) => {
			if (id !== state.spinnerTaskId) {
				return [
					Effect.logWarning(`ShowSpinner is stale`).pipe(
						Effect.as(Message.NoOp()),
					),
				]
			}
			state.isLoading = true
			return []
		}),
		Match.tag(`RemoveToast`, ({ id }) => {
			if (id !== state.toastMessage?.id) {
				return [
					Effect.logWarning(`RemoveToast is stale`).pipe(
						Effect.as(Message.NoOp()),
					),
				]
			}

			state.toastMessage = undefined

			return []
		}),
		Match.tag(`ShowCrash`, () => {
			const id = Symbol()
			state.toastMessage = {
				message: `An unexpected error occurred and the app had to be reloaded`,
				id,
				type: `error`,
			}

			return [queueRemoveToast(id)]
		}),
		Match.tag(`ToggleMenu`, () => {
			state.isMenuOpen = !state.isMenuOpen

			return []
		}),
		Match.tag(`NoOp`, () => []),
		Match.tag(`Crash`, () => {
			state.hasCrashOccurred = true
			return []
		}),
		Match.exhaustive,
	)(message)
}
