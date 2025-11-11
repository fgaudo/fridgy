import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Function from 'effect/Function'
import { pipe } from 'effect/Function'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import type { UseCases } from '../../business/app/use-cases.ts'
import type { GetSortedProductsDTO } from '../../business/app/use-cases/get-sorted-products.ts'
import { commands, modify, noOp } from '../../core/helper.ts'
import * as NonEmptyHashSet from '../../core/non-empty-hash-set.ts'
import type { Command, Update } from '../../core/state-manager.ts'
import { deleteSelectedAndRefresh, refreshList } from './commands.ts'
import { type ProductViewModel, type State } from './state.ts'

type _Message = {
	FetchList: object
	DeleteAndRefresh: { ids: NonEmptyHashSet.NonEmptyHashSet<string> }
}

export type Message = Data.TaggedEnum<_Message>
export const Message = Data.taggedEnum<Message>()

export type InternalMessage = Data.TaggedEnum<
	_Message & {
		FetchListSucceeded: {
			taskId: symbol
			result: GetSortedProductsDTO
		}
		FetchListFailed: { taskId: symbol }
		DeleteFailed: object
		DeleteSucceededButRefreshFailed: object
		DeleteAndRefreshSucceeded: {
			result: GetSortedProductsDTO
		}
		NoOp: object
		Crash: { message: unknown }
	}
>
const State = Data.struct<State>
const ProductViewModel = Data.struct<ProductViewModel>

export const InternalMessage = Data.taggedEnum<InternalMessage>()

const matcher = Match.typeTags<
	InternalMessage,
	(s: Readonly<State>) => Readonly<{
		state: State
		commands: Command<InternalMessage, UseCases>[]
	}>
>()

const update_: Update<State, InternalMessage, UseCases> = matcher({
	FetchList: () =>
		modify(draft => {
			const taskId = Symbol()
			draft.maybeRefreshingTaskId = Option.some(taskId)
			draft.isLoading = true

			return [refreshList(taskId)]
		}),
	FetchListFailed:
		({ taskId }) =>
		state => {
			if (
				Option.isSome(state.maybeRefreshingTaskId) &&
				taskId !== state.maybeRefreshingTaskId.value
			) {
				return commands(state, [
					Effect.gen(function* () {
						yield* Effect.logWarning(`FetchListFailed is stale`)
						return InternalMessage.NoOp()
					}),
				])
			}

			return modify(state, draft => {
				draft.isLoading = false
				draft.receivedError = true
			})
		},

	FetchListSucceeded:
		({ result, taskId }) =>
		state => {
			if (
				Option.isNone(state.maybeRefreshingTaskId) ||
				taskId !== state.maybeRefreshingTaskId.value
			) {
				return commands(state, [
					Effect.gen(function* () {
						yield* Effect.logWarning(`FetchListSucceeded is stale`)
						return InternalMessage.NoOp()
					}),
				])
			}

			return modify(state, draft => {
				draft.isLoading = false
				draft.receivedError = false
				draft.maybeProducts = pipe(
					result,
					Arr.map(entry => {
						if (entry.isCorrupt) {
							return ProductViewModel({
								...entry,
								id: Symbol(),
							})
						}

						return ProductViewModel(entry)
					}),
					models =>
						Arr.isNonEmptyArray(models)
							? Option.some(models)
							: Option.none<Arr.NonEmptyArray<ProductViewModel>>(),
				)
			})
		},
	DeleteAndRefresh:
		({ ids }) =>
		state => {
			if (state.isDeleteRunning) {
				return noOp(state)
			}

			return modify(state, draft => {
				draft.isDeleteRunning = true

				return [deleteSelectedAndRefresh(ids)]
			})
		},
	DeleteAndRefreshSucceeded: ({ result }) =>
		modify(draft => {
			draft.isDeleteRunning = false
			draft.isLoading = false

			draft.maybeProducts = pipe(
				result,
				Arr.map(entry => {
					if (entry.isCorrupt) {
						return ProductViewModel({
							...entry,
							id: Symbol(),
						})
					}

					return ProductViewModel(entry)
				}),
				models =>
					Arr.isNonEmptyArray(models)
						? Option.some(models)
						: Option.none<Arr.NonEmptyArray<ProductViewModel>>(),
			)
		}),
	DeleteFailed: () =>
		modify(draft => {
			draft.isDeleteRunning = false
			draft.isLoading = false
		}),
	DeleteSucceededButRefreshFailed: () =>
		modify(draft => {
			draft.isDeleteRunning = false
			draft.maybeProducts = Option.none<Arr.NonEmptyArray<ProductViewModel>>()
			draft.receivedError = true
			draft.isLoading = false
		}),
	NoOp: () => noOp.func(),
	Crash: () =>
		modify(draft => {
			draft.hasCrashOccurred = true
		}),
})

export const update: Update<State, InternalMessage, UseCases> = Function.dual<
	(message: InternalMessage) => (state: State) => {
		state: State
		commands: Command<InternalMessage, UseCases>[]
	},
	(
		state: State,
		message: InternalMessage,
	) => {
		state: State
		commands: Command<InternalMessage, UseCases>[]
	}
>(2, (state, message) => update_(message)(state))
