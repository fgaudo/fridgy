import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as FiberId from 'effect/FiberId'
import { pipe } from 'effect/Function'
import * as Function from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Iterable from 'effect/Iterable'
import * as Match from 'effect/Match'
import * as NonEmptyIterable from 'effect/NonEmptyIterable'
import * as Option from 'effect/Option'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'

import * as H from '@/core/helper.ts'
import * as Integer from '@/core/integer/integer.ts'
import * as PositiveInteger from '@/core/integer/positive.ts'
import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
import * as NonEmptyIterableHelper from '@/core/non-empty-iterable.ts'
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
	SchedulerStarted: { id: FiberId.FiberId }
}>

type InternalMessage =
	| Message
	| _InternalMessage
	| H.MapTags<
			UC.GetSortedProducts.Response,
			{
				Failed: `FetchListFailed`
				Succeeded: `FetchListSucceeded`
			}
	  >
	| H.MapTags<
			UC.DeleteProductsByIdsAndRetrieve.Response,
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
		Match.valueTags({
			DeleteSucceededButRefreshFailed: () =>
				InternalMessage.DeleteSucceededButRefreshFailed(),
			Failed: () => InternalMessage.DeleteFailed(),
			Succeeded: ({ maybeProducts }) =>
				InternalMessage.DeleteAndRefreshSucceeded({ maybeProducts }),
		}),
	),
)

const fetchList = Effect.map(
	UC.GetSortedProducts.Service.run,
	Match.valueTags({
		Failed: () => InternalMessage.FetchListFailed(),
		Succeeded: ({ maybeProducts }) =>
			InternalMessage.FetchListSucceeded({ maybeProducts }),
	}),
)

////
////

type State = {
	schedulerEnabled: boolean
	isBusy: boolean
	productListStatus: Data.TaggedEnum<{
		Initial: object
		StartupError: object
		Empty: object
		Available: {
			maybeSelectedProducts: Option.Option<
				NonEmptyHashSet.NonEmptyHashSet<string>
			>
			total: PositiveInteger.PositiveInteger
			products: NonEmptyIterable.NonEmptyIterable<
				Data.TaggedEnum<{
					Corrupt: {
						maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
						id: symbol
					}
					Invalid: {
						id: string
						maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
					}
					Valid: {
						id: string
						name: NonEmptyTrimmedString.NonEmptyTrimmedString
						status: Data.TaggedEnum<{
							Everlasting: object
							Stale: { expirationDate: Integer.Integer }
							Fresh: {
								expirationDate: Integer.Integer
								timeLeft: Integer.Integer
								freshnessRatio: UnitInterval.UnitInterval
							}
						}>
					}
				}>
			>
		}
	}>
}

type NonEmptyIterableValue<T extends NonEmptyIterable.NonEmptyIterable<any>> = [
	T,
] extends [NonEmptyIterable.NonEmptyIterable<infer F>]
	? F
	: never

export type ProductDTO = NonEmptyIterableValue<
	Data.TaggedEnum.Value<State['productListStatus'], 'Available'>['products']
>

const ProductDTO = Data.taggedEnum<ProductDTO>()

////
////

const matcher = Match.typeTags<
	InternalMessage,
	ReturnType<SM.Update<State, InternalMessage, UC.All>>
>()

const update = matcher({
	FetchListFailed: () => state => ({ state, commands: [] }),

	FetchListSucceeded:
		({ maybeProducts }) =>
		state => {
			if (Option.isNone(maybeProducts)) {
				return {
					state: {
						...state,
						productListStatus: { _tag: 'Empty' },
					} satisfies State,
					commands: [],
				}
			}

			const loadProducts = {
				total: maybeProducts.value.total,
				products: NonEmptyIterableHelper.map(
					maybeProducts.value.list,
					product => {
						if (product._tag === 'Corrupt') {
							return ProductDTO.Corrupt({ ...product, id: Symbol() })
						}

						return product
					},
				),
			} satisfies Partial<State['productListStatus']>

			if (state.productListStatus._tag === 'Available') {
				return {
					commands: [],
					state: {
						...state,
						productListStatus: {
							_tag: 'Available',
							...loadProducts,
							maybeSelectedProducts: pipe(
								state.productListStatus.maybeSelectedProducts,
								Option.map(
									HashSet.intersection(
										pipe(
											maybeProducts.value.list,
											Iterable.filter(product => product._tag !== 'Corrupt'),
											Iterable.map(product => product.id),
										),
									),
								),
								Option.flatMap(NonEmptyHashSet.fromHashSet),
							),
						},
					} satisfies State,
				}
			}

			return {
				commands: [],
				state: {
					...state,
					productListStatus: {
						_tag: 'Available',
						...loadProducts,
						maybeSelectedProducts: Option.none(),
					},
				} satisfies State,
			}
		},
	StartDeleteAndRefresh:
		({ ids }) =>
		state => {
			if (state.isBusy) {
				return { state, commands: [] }
			}

			return {
				state: { ...state, isBusy: true } satisfies State,
				commands: [deleteProductsByIds({ ids })],
			}
		},

	DeleteAndRefreshSucceeded:
		({ maybeProducts }) =>
		state => {
			if (Option.isNone(maybeProducts)) {
				return {
					state: {
						...state,
						isBusy: false,
						productListStatus: { _tag: 'Empty' },
					} satisfies State,
					commands: [],
				}
			}

			return {
				commands: [],
				state: {
					...state,
					isBusy: false,
					productListStatus: {
						_tag: 'Available',
						total: maybeProducts.value.total,
						products: NonEmptyIterableHelper.map(
							maybeProducts.value.list,
							product => {
								if (product._tag === 'Corrupt') {
									return ProductDTO.Corrupt({ ...product, id: Symbol() })
								}

								return product
							},
						),
						maybeSelectedProducts: Option.none(),
					},
				} satisfies State,
			}
		},

	DeleteFailed: () => state => ({
		state: { ...state, isBusy: false },
		commands: [],
	}),

	DeleteSucceededButRefreshFailed: () => state => ({
		state: { ...state, isBusy: false },
		commands: [],
	}),

	StartFetchList: () => state => {
		return {
			state,
			commands: [],
		}
	},

	SchedulerStarted:
		({ id }) =>
		state => ({
			state: { ...state, maybeScheduler: Option.some(id) },
			commands: [],
		}),
})

const makeViewModel = Effect.gen(function* () {
	const initState: State = {
		schedulerEnabled: true,
		isBusy: false,
		productListStatus: { _tag: 'Initial' },
	}

	const viewModel = yield* SM.makeStateManager({
		subscriptions: [
			{
				selector: state => state.isBusy,
				create: state =>
					Stream.schedule(
						Stream.fromEffect(fetchList),
						Schedule.spaced('20 seconds'),
					),
			},
		],
		initState,
		update,
	})

	yield* viewModel.dispatch(InternalMessage.StartFetchList())

	return {
		...viewModel,
		messages: Stream.filterMap(
			viewModel.messages,
			Function.flow(
				Match.value,
				Match.tags({
					DeleteFailed: ({ _tag }) => Option.some(_tag),
					DeleteSucceededButRefreshFailed: ({ _tag }) => Option.some(_tag),
					FetchListFailed: ({ _tag }) => Option.some(_tag),
				}),
				Match.orElse(Option.none),
			),
		),
		dispatch: (m: Message) => viewModel.dispatch(m),
	} as const
})

export { makeViewModel, Message }
