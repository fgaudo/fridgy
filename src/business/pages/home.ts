import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as FiberId from 'effect/FiberId'
import { pipe } from 'effect/Function'
import * as Function from 'effect/Function'
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

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

////
////

type Message = Data.TaggedEnum<{
	StartFetchList: object
	StartDeleteAndRefresh: { ids: NonEmptyHashSet.NonEmptyHashSet<string> }
}>

const Message = Data.taggedEnum<Message>()

type _InternalMessage = Data.TaggedEnum<{
	StartScheduler: object
	SchedulerStarted: { id: FiberId.FiberId }
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

////
////

const State = Schema.Struct({
	maybeScheduler: Schema.Option(Schema.FiberId),
	isBusy: Schema.Boolean,
	refreshStatus: Schema.Union(
		Schema.TaggedStruct('Error', {
			message: NonEmptyTrimmedString.Schema,
		}),
		Schema.TaggedStruct('Uninitialized', {}),
		Schema.TaggedStruct('Success', {
			maybeProducts: Schema.Option(
				Schema.NonEmptyArray(
					Schema.Union(
						Schema.TaggedStruct('Corrupt', {
							maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
							id: Schema.Symbol,
						}),
						Schema.TaggedStruct('Invalid', {
							maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
							id: Schema.String,
						}),
						Schema.TaggedStruct('Valid', {
							id: Schema.String,
							name: NonEmptyTrimmedString.Schema,
							maybeExpiration: Schema.Option(
								Schema.Union(
									Schema.TaggedStruct('Stale', {
										date: Integer.Schema,
									}),
									Schema.TaggedStruct('Fresh', {
										freshness: UnitInterval.Schema,
										timeLeft: Integer.Schema,
										date: Integer.Schema,
									}),
								),
							),
						}),
					),
				),
			),
		}),
	),
})

type State = Schema.Schema.Type<typeof State>

export type ProductDTO = Option.Option.Value<
	Data.TaggedEnum.Value<State['refreshStatus'], 'Success'>['maybeProducts']
>[0]

////
////

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
				draft.refreshStatus = {
					_tag: 'Success',
					maybeProducts: pipe(
						result,
						Option.map(
							Arr.map(v => {
								if (v._tag === 'Corrupt') {
									return { ...v, id: Symbol() }
								}
								return v
							}),
						),
					),
				}
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

				draft.refreshStatus = {
					_tag: 'Success',
					maybeProducts: pipe(
						result,
						Option.map(
							Arr.map(v => {
								if (v._tag === 'Corrupt') {
									return { ...v, id: Symbol() }
								}
								return v
							}),
						),
					),
				}
			}),

	DeleteFailed: () =>
		SM.modify(draft => {
			draft.isBusy = false
		}),

	DeleteSucceededButRefreshFailed: () =>
		SM.modify(draft => {
			draft.isBusy = false
			draft.refreshStatus = {
				_tag: 'Error',
				message: NonEmptyTrimmedString.unsafeFromString('ciao'),
			}
		}),

	StartScheduler: () =>
		SM.operations([
			Operation.subscription({
				init: id => InternalMessage.SchedulerStarted({ id }),
				stream: () =>
					pipe(
						Stream.succeed(InternalMessage.StartFetchList()),
						Stream.schedule(Schedule.spaced('20 seconds')),
					),
			}),
		]),

	SchedulerStarted: ({ id }) =>
		SM.modify(draft => {
			draft.maybeScheduler = Option.some(id)
		}),
})

const makeViewModel = Effect.gen(function* () {
	const initState: State = {
		maybeScheduler: Option.none(),
		isBusy: false,
		refreshStatus: { _tag: 'Uninitialized' },
	}

	const viewModel = yield* SM.makeStateManager({
		initState,
		update,
	})

	yield* viewModel.dispatch(InternalMessage.StartScheduler())

	return {
		...viewModel,
		messages: Stream.filterMap(
			viewModel.messages,
			Function.flow(
				Match.value,
				Match.tags({
					DeleteAndRefreshSucceeded: ({ _tag }) => Option.some(_tag),
					DeleteFailed: ({ _tag }) => Option.some(_tag),
					DeleteSucceededButRefreshFailed: ({ _tag }) => Option.some(_tag),
					FetchListFailed: ({ _tag }) => Option.some(_tag),
					FetchListSucceeded: ({ _tag }) => Option.some(_tag),
				}),
				Match.orElse(() => Option.none()),
			),
		),
		dispatch: (m: Message) => viewModel.dispatch(m),
	} as const
})

export { makeViewModel, Message }
