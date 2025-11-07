import { Haptics, ImpactStyle } from '@capacitor/haptics'
import * as Array from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Function from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import type { UseCases } from '../../business/app/use-cases.ts'
import type { GetSortedProductsDTO } from '../../business/app/use-cases/get-sorted-products.ts'
import * as NonEmptyHashSet from '../../core/non-empty-hash-set.ts'
import * as NonEmptyTrimmedString from '../../core/non-empty-trimmed-string.ts'
import type { Command, Update } from '../../core/state-manager.ts'
import {
	deleteSelectedAndRefresh,
	queueLoading,
	queueRemoveToast,
	refreshList,
	refreshTime,
} from './commands.ts'
import { type ProductViewModel, type State } from './state.ts'

type _Message = {
	FetchList: object
	StartDeleteSelectedAndRefresh: object
	ClearSelected: object
	ToggleItem: {
		product: ProductViewModel
	}
}

export type Message = Data.TaggedEnum<_Message>
export const Message = Data.taggedEnum<Message>()

export type InternalMessage = Data.TaggedEnum<
	_Message & {
		RemoveToast: { id: symbol }
		StartRefreshTime: object
		FetchListSucceeded: {
			taskId: symbol
			result: GetSortedProductsDTO
		}
		FetchListFailed: { taskId: symbol }

		DeleteSelectedFailed: object
		DeleteSelectedSucceededButRefreshFailed: object
		DeleteSelectedAndRefreshSucceeded: {
			result: GetSortedProductsDTO
		}
		RefreshTimeResult: { timestamp: number }
		ShowSpinner: { id: symbol }
		NoOp: object
		ShowCrash: object
		Crash: { message: unknown }
	}
>

export const InternalMessage = Data.taggedEnum<InternalMessage>()

const matcher = Match.typeTags<
	InternalMessage,
	(s: Readonly<State>) => Readonly<{
		state: State
		commands: Command<InternalMessage, UseCases>[]
	}>
>()

const update_: Update<State, InternalMessage, UseCases> = matcher({
	StartRefreshTime: () => state => {
		return { state, commands: [refreshTime] }
	},
	FetchList: () => state => {
		const taskId = Symbol()

		return {
			state: { ...state, refreshingTaskId: taskId, isLoading: true },
			commands: [refreshList(taskId)],
		}
	},
	FetchListFailed:
		({ taskId }) =>
		state => {
			if (taskId !== state.refreshingTaskId) {
				return {
					state,
					commands: [
						Effect.logWarning(`FetchListFailed is stale`).pipe(
							Effect.as(InternalMessage.NoOp()),
						),
					],
				}
			}

			return {
				state: { ...state, isLoading: false, receivedError: true },
				commands: [],
			}
		},

	FetchListSucceeded:
		({ result, taskId }) =>
		state => {
			if (taskId !== state.refreshingTaskId) {
				return {
					state,
					commands: [
						Effect.logWarning(`FetchListSucceeded is stale`).pipe(
							Effect.as(InternalMessage.NoOp()),
						),
					],
				}
			}

			return {
				state: {
					...state,
					isLoading: false,
					receivedError: false,
					products: result.map(entry => {
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
					selectedProducts: HashSet.empty(),
				},
				commands: [],
			}
		},
	StartDeleteSelectedAndRefresh: () => state => {
		if (state.isDeleteRunning) {
			return { state, commands: [] }
		}

		const maybeIds = pipe(
			state.selectedProducts,
			HashSet.fromIterable,
			NonEmptyHashSet.fromHashSet,
		)

		if (Option.isNone(maybeIds)) {
			return { state, commands: [] }
		}

		const id = Symbol()

		return {
			state: { ...state, spinnerTaskId: id },
			commands: [deleteSelectedAndRefresh(maybeIds.value), queueLoading(id)],
		}
	},
	DeleteSelectedAndRefreshSucceeded:
		({ result }) =>
		state => {
			return {
				state: {
					...state,
					isDeleteRunning: false,
					isLoading: false,
					spinnerTaskId: undefined,
					selectedProducts: HashSet.empty(),
					products: Array.map(result, entry => {
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
				},
				commands: [],
			}
		},
	DeleteSelectedFailed: () => state => {
		return {
			state: {
				...state,
				isDeleteRunning: false,
				isLoading: false,
				spinnerTaskId: undefined,
			},
			commands: [],
		}
	},
	DeleteSelectedSucceededButRefreshFailed: () => state => {
		return {
			state: {
				...state,
				isDeleteRunning: false,
				products: undefined,
				receivedError: true,
				spinnerTaskId: undefined,
				isLoading: false,
			},
			commands: [],
		}
	},
	ClearSelected: () => state => {
		if (state.products === undefined) {
			return { state, commands: [] }
		}

		return {
			state: {
				...state,
				selectedProducts: HashSet.empty(),
				products: Array.map(state.products, entry => {
					if (entry.isCorrupt) return entry
					return { ...entry, isSelected: false }
				}),
			},
			commands: [],
		}
	},
	ToggleItem:
		({ product }) =>
		state => {
			if (state.isDeleteRunning) {
				return { state, commands: [] }
			}

			if (product.isCorrupt) {
				return { state, commands: [] }
			}

			if (state.products === undefined) {
				return { state, commands: [] }
			}

			if (HashSet.has(state.selectedProducts, product.id)) {
				return {
					state: {
						...state,
						selectedProducts: HashSet.remove(
							state.selectedProducts,
							product.id,
						),
					},
					commands: [],
				}
			}

			const hasSelectionStarted = HashSet.size(state.selectedProducts) <= 0

			return {
				state: {
					...state,
					selectedProducts: HashSet.add(state.selectedProducts, product.id),
				},
				commands: hasSelectionStarted
					? [
							Effect.promise(() =>
								Haptics.impact({
									style: ImpactStyle.Light,
								}),
							).pipe(Effect.as(InternalMessage.NoOp())),
						]
					: [],
			}
		},
	RefreshTimeResult:
		({ timestamp }) =>
		state => {
			return {
				state: { ...state, currentTimestamp: timestamp },
				commands: [],
			}
		},
	ShowSpinner:
		({ id }) =>
		state => {
			if (id !== state.spinnerTaskId) {
				return {
					state,
					commands: [
						Effect.logWarning(`ShowSpinner is stale`).pipe(
							Effect.as(InternalMessage.NoOp()),
						),
					],
				}
			}
			return { state: { ...state, isLoading: true }, commands: [] }
		},
	RemoveToast:
		({ id }) =>
		state => {
			if (id !== state.toastId) {
				return {
					state,
					commands: [
						Effect.logWarning(`RemoveToast is stale`).pipe(
							Effect.as(InternalMessage.NoOp()),
						),
					],
				}
			}

			return { state: { ...state, toastId: undefined }, commands: [] }
		},
	ShowCrash: () => state => {
		const id = Symbol()

		return {
			state: {
				...state,
				toastMessage: NonEmptyTrimmedString.unsafeFromString(
					`An unexpected error occurred and the app had to be reloaded`,
				),
				toastId: id,
				toastType: `error`,
			},
			commands: [queueRemoveToast(id)],
		}
	},
	NoOp: () => state => ({ state, commands: [] }),
	Crash: () => state => {
		return { state: { ...state, hasCrashOccurred: true }, commands: [] }
	},
})

export const update: Update<State, InternalMessage, UseCases> = Function.dual<
	(message: InternalMessage) => (state: State) => {
		state: State
		commands: Command<InternalMessage, UseCases>[]
	},
	(
		state: State,
		message: InternalMessage,
	) => { state: State; commands: Command<InternalMessage, UseCases>[] }
>(2, (state, message) => update_(message)(state))
