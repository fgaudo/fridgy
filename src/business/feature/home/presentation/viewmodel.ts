import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { modify, noOp } from '@/core/helper.ts'
import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import { type Command, makeStateManager } from '@/core/state-manager.ts'

import * as DeleteProductsByIds from '@/feature/home/app/usecases/delete-products-by-ids-and-retrieve'
import * as GetSortedProducts from '@/feature/home/app/usecases/get-sorted-products.ts'
import { type UseCases, useCases } from '@/feature/home/app/usecases/index.ts'

type Message = Data.TaggedEnum<{
	FetchList: object
	DeleteAndRefresh: { ids: NonEmptyHashSet.NonEmptyHashSet<string> }
}>

const Message = Data.taggedEnum<Message>()

const ProductViewModelSchema = Schema.Union(
	Schema.Struct({
		isCorrupt: Schema.Literal(false),
		id: Schema.String,
		maybeName: Schema.Option(Schema.String),
		maybeExpirationDate: Schema.Option(Schema.Number),
		maybeCreationDate: Schema.Option(Schema.Number),
		isValid: Schema.Literal(false),
	}),
	Schema.Struct({
		isCorrupt: Schema.Literal(false),
		id: Schema.String,
		name: Schema.String,
		maybeExpirationDate: Schema.Option(Schema.Number),
		creationDate: Schema.Number,
		isValid: Schema.Literal(true),
	}),
	Schema.Struct({
		id: Schema.Symbol,
		isCorrupt: Schema.Literal(true),
		maybeName: Schema.Option(Schema.NonEmptyTrimmedString),
	}),
)

type ProductViewModel = Schema.Schema.Type<typeof ProductViewModelSchema>

const ProductViewModel = Data.struct<ProductViewModel>

const State = Schema.Struct({
	receivedError: Schema.Boolean,
	maybeRefreshingTaskId: Schema.Option(Schema.Symbol),
	isDeleteRunning: Schema.Boolean,
	hasCrashOccurred: Schema.Boolean,

	maybeMessage: Schema.Option(NonEmptyTrimmedString.Schema),
	messageType: Schema.Union(Schema.Literal(`error`), Schema.Literal(`success`)),

	isLoading: Schema.Boolean,

	maybeProducts: Schema.Option(Schema.NonEmptyArray(ProductViewModelSchema)),
})

type State = Schema.Schema.Type<typeof State>

type InternalMessage =
	| Message
	| GetSortedProducts.Message
	| DeleteProductsByIds.Message

const matcher = Match.typeTags<
	InternalMessage,
	(s: Readonly<State>) => Readonly<{
		state: State
		commands: Command<InternalMessage, UseCases>[]
	}>
>()

const update = matcher({
	FetchList: () =>
		modify(draft => {
			const taskId = Symbol()
			draft.maybeRefreshingTaskId = Option.some(taskId)
			draft.isLoading = true

			return [GetSortedProducts.GetSortedProducts.run]
		}),
	FetchListFailed: () =>
		modify(draft => {
			draft.isLoading = false
			draft.receivedError = true
		}),
	FetchListSucceeded:
		({ result }) =>
		state => {
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

				return [DeleteProductsByIds.DeleteProductsByIdsAndRetrieve.run(ids)]
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
})

const makeViewModel = Effect.provide(
	Effect.gen(function* () {
		const viewModel = yield* makeStateManager({
			initState: {} as State,
			update,
		})

		return {
			dispose: viewModel.dispose,
			dispatch: (m: Message) => viewModel.dispatch(m),
			initState: viewModel.initState,
			changes: viewModel.changes,
		}
	}),
	useCases,
)

export { makeViewModel, Message }
