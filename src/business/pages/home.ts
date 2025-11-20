import * as Arr from 'effect/Array'
import * as Clock from 'effect/Clock'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as FiberId from 'effect/FiberId'
import { pipe } from 'effect/Function'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as Schedule from 'effect/Schedule'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'

import * as H from '@/core/helper.ts'
import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as SM from '@/core/state-manager.ts'
import * as UnitInterval from '@/core/unit-interval.ts'

import {
	Rules,
	UseCasesWithoutDependencies as UC,
} from '@/feature/product-management/index.ts'

type Message = Data.TaggedEnum<{
	StartFetchList: object
	StartDeleteAndRefresh: { ids: NonEmptyHashSet.NonEmptyHashSet<string> }
	StartUpdateCurrentTime: object
}>

const Message = Data.taggedEnum<Message>()

const ProductViewModelSchema = Schema.Union(
	Schema.Struct({
		isCorrupt: Schema.Literal(false),
		id: Schema.String,
		maybeName: Schema.Option(Schema.String),
		isValid: Schema.Literal(false),
	}),
	Schema.extend(
		Schema.Struct({
			isCorrupt: Schema.Literal(false),
			id: Schema.String,
			name: Schema.String,
			isValid: Schema.Literal(true),
		}),
		Schema.Union(
			Schema.Struct({
				timeLeft: Integer.Schema,
				freshness: UnitInterval.Schema,
				expirationDate: Integer.Schema,
				isStale: Schema.Literal(false),
			}),
			Schema.Struct({
				expirationDate: Integer.Schema,
				isStale: Schema.Literal(true),
			}),

			Schema.Struct({
				expirationDate: Schema.Literal(`none`),
			}),
		),
	),
	Schema.Struct({
		id: Schema.Symbol,
		isCorrupt: Schema.Literal(true),
		maybeName: Schema.Option(Schema.NonEmptyTrimmedString),
	}),
)

type ProductViewModel = Schema.Schema.Type<typeof ProductViewModelSchema>

const ProductViewModel = Data.struct<ProductViewModel>

const State = Schema.extend(
	Schema.Struct({
		maybeScheduler: Schema.Option(Schema.FiberId),
		currentDate: Integer.Schema,
		isBusy: Schema.Boolean,
		maybeProducts: Schema.Option(Schema.NonEmptyArray(ProductViewModelSchema)),
	}),
	Schema.Union(
		Schema.Struct({
			maybeMessage: NonEmptyTrimmedString.Schema,
			messageType: Schema.Union(
				Schema.Literal(`error`),
				Schema.Literal(`success`),
			),
		}),
		Schema.Struct({
			messageType: Schema.Literal(`none`),
		}),
	),
)

type State = Schema.Schema.Type<typeof State>

type _InternalMessage = Data.TaggedEnum<{
	StartScheduler: object
	SchedulerStarted: { id: FiberId.FiberId }
	UpdateCurrentTime: { currentDate: Integer.Integer }
}>

type InternalMessage =
	| Message
	| _InternalMessage
	| H.MapTags<
			UC.GetSortedProducts.Message,
			{
				Failed: `FetchListFailed`
				Succeeded: `FetchListSucceeded`
			}
	  >
	| H.MapTags<
			UC.DeleteProductsByIdsAndRetrieve.Message,
			{
				Succeeded: `DeleteAndRefreshSucceeded`
				Failed: `DeleteFailed`
				DeleteSucceededButRefreshFailed: `DeleteSucceededButRefreshFailed`
			}
	  >

const InternalMessage = Data.taggedEnum<InternalMessage>()

const mapToViewModels = (entries: UC.GetSortedProducts.DTO, state: State) => {
	return pipe(
		entries,
		Arr.map(entry => {
			if (entry.isCorrupt) {
				return ProductViewModel({
					...entry,
					id: Symbol(),
				})
			}

			if (!entry.isValid) {
				return entry
			}

			if (Option.isNone(entry.maybeExpirationDate)) {
				return ProductViewModel({
					expirationDate: `none` as const,
					id: entry.id,
					name: entry.name,
					isValid: true,
					isCorrupt: false,
				})
			}

			const partial = {
				expirationDate: entry.maybeExpirationDate.value,
				id: entry.id,
				isValid: true,
				isCorrupt: false,
				name: entry.name,
			} as const

			if (
				Rules.isProductStale({
					expirationDate: entry.maybeExpirationDate.value,
					currentDate: state.currentDate,
				})
			) {
				return ProductViewModel({
					...partial,
					isStale: true,
				})
			}

			return ProductViewModel({
				...partial,
				isStale: false,
				freshness: Rules.computeFreshness({
					creationDate: entry.creationDate,
					expirationDate: entry.maybeExpirationDate.value,
					currentDate: state.currentDate,
				}),
				timeLeft: Integer.unsafeFromNumber(
					entry.maybeExpirationDate.value - state.currentDate,
				),
			})
		}),
		models =>
			Arr.isNonEmptyArray(models)
				? Option.some(models)
				: Option.none<Arr.NonEmptyArray<ProductViewModel>>(),
	)
}

const deleteProductsByIds = H.mapFunctionReturn(
	UC.DeleteProductsByIdsAndRetrieve.Service.run,
	Effect.map(
		UC.DeleteProductsByIdsAndRetrieve.Message.$match({
			DeleteSucceededButRefreshFailed: () =>
				InternalMessage.DeleteSucceededButRefreshFailed(),
			Failed: () => InternalMessage.DeleteFailed(),
			Succeeded: ({ result }) =>
				InternalMessage.DeleteAndRefreshSucceeded({ result }),
		}),
	),
)

const fetchList = Effect.map(
	UC.GetSortedProducts.Service.run,
	UC.GetSortedProducts.Message.$match({
		Failed: () => InternalMessage.FetchListFailed(),
		Succeeded: ({ result }) => InternalMessage.FetchListSucceeded({ result }),
	}),
)

const Operation = SM.Operation<State, InternalMessage, UC.All>()

const matcher = Match.typeTags<
	InternalMessage,
	ReturnType<SM.Update<State, InternalMessage, UC.All>>
>()

const update = matcher({
	StartFetchList: () =>
		SM.modify(draft => {
			draft.isBusy = true

			return [Operation.command({ effect: fetchList })]
		}),

	FetchListFailed: () =>
		SM.modify(draft => {
			draft.isBusy = false
		}),

	FetchListSucceeded:
		({ result }) =>
		state => {
			return SM.modify(state, draft => {
				draft.isBusy = false
				draft.maybeProducts = mapToViewModels(result, state)
			})
		},

	StartDeleteAndRefresh:
		({ ids }) =>
		state => {
			if (state.isBusy) {
				return SM.noOp(state)
			}

			return SM.modify(state, draft => {
				draft.isBusy = true

				return [Operation.command({ effect: deleteProductsByIds(ids) })]
			})
		},

	DeleteAndRefreshSucceeded:
		({ result }) =>
		state =>
			SM.modify(state, draft => {
				draft.isBusy = false

				draft.maybeProducts = mapToViewModels(result, state)
			}),

	DeleteFailed: () =>
		SM.modify(draft => {
			draft.isBusy = false
		}),

	DeleteSucceededButRefreshFailed: () =>
		SM.modify(draft => {
			draft.isBusy = false
			draft.maybeProducts = Option.none<Arr.NonEmptyArray<ProductViewModel>>()
		}),

	StartScheduler: () =>
		SM.operations([
			Operation.subscription({
				init: id => InternalMessage.SchedulerStarted({ id }),
				stream: () =>
					pipe(
						Schedule.spaced('20 seconds'),
						Stream.fromSchedule,
						Stream.mapEffect(() => Clock.currentTimeMillis),
						Stream.filterMap(Integer.fromNumber),
						Stream.map(currentDate =>
							InternalMessage.UpdateCurrentTime({ currentDate }),
						),
					),
			}),
		]),

	SchedulerStarted: ({ id }) =>
		SM.modify(draft => {
			draft.maybeScheduler = Option.some(id)
		}),

	UpdateCurrentTime: ({ currentDate }) =>
		SM.modify(draft => {
			draft.currentDate = currentDate
		}),

	StartUpdateCurrentTime: () => state =>
		SM.modify(state, draft => {
			const updateTime = Operation.command({
				effect: pipe(
					Clock.currentTimeMillis,
					Effect.map(Integer.unsafeFromNumber),
					Effect.map(date =>
						InternalMessage.UpdateCurrentTime({ currentDate: date }),
					),
				),
			})

			if (Option.isNone(state.maybeScheduler)) {
				return [updateTime]
			}

			draft.maybeScheduler = Option.none()

			return [
				Operation.cancel({ id: state.maybeScheduler.value }),
				Operation.command({
					effect: Effect.succeed(InternalMessage.StartScheduler()),
				}),
				updateTime,
			]
		}),
})

const makeViewModel = Effect.gen(function* () {
	const initState: State = {
		maybeScheduler: Option.none(),
		currentDate: Integer.unsafeFromNumber(yield* Clock.currentTimeMillis),
		isBusy: false,
		maybeProducts: Option.none(),
		messageType: `none`,
	}

	const viewModel = yield* SM.makeStateManager({
		initState,
		update,
	})

	yield* viewModel.dispatch(InternalMessage.StartScheduler())

	return {
		...viewModel,
		dispatch: (m: Message) => viewModel.dispatch(m),
	}
})

export { makeViewModel, Message }
