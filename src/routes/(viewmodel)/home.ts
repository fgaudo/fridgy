import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { flow, pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Iterable from 'effect/Iterable'
import * as List from 'effect/List'
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
import type { ViewModel } from '@/core/viewmodel.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

////
////

type Message = Data.TaggedEnum<{
	StartFetchList: object
	StartDeleteAndRefresh: object
}>

const Message = Data.taggedEnum<Message>()

type _InternalMessage = Data.TaggedEnum<{
	NoOp: object
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

type State = Readonly<{
	refreshSchedulerEnabled: boolean
	isBusy: boolean
	productListStatus: Data.TaggedEnum<{
		Initial: object
		Error: object
		Empty: object
		Available: Readonly<{
			maybeSelectedProducts: Option.Option<
				NonEmptyHashSet.NonEmptyHashSet<string>
			>
			total: PositiveInteger.PositiveInteger
			products: NonEmptyIterable.NonEmptyIterable<
				Data.TaggedEnum<{
					Corrupt: Readonly<{
						maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
						id: symbol
					}>
					Invalid: Readonly<{
						id: string
						maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
					}>
					Valid: Readonly<{
						id: string
						name: NonEmptyTrimmedString.NonEmptyTrimmedString
						status: Data.TaggedEnum<{
							Everlasting: object
							Stale: Readonly<{ expirationDate: Integer.Integer }>
							Fresh: Readonly<{
								expirationDate: Integer.Integer
								timeLeft: Integer.Integer
								freshnessRatio: UnitInterval.UnitInterval
							}>
						}>
					}>
				}>
			>
		}>
	}>
}>

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

type Command = SM.Command<InternalMessage, UC.All>

const update = matcher({
	NoOp: () => state => ({ state, commands: List.empty() }),

	FetchListFailed: () => state => {
		if (state.productListStatus._tag === 'Initial') {
			return {
				state: {
					...state,
					refreshSchedulerEnabled: false,
					productListStatus: { _tag: 'Error' },
				} satisfies State,
				commands: List.empty(),
			}
		}

		return {
			state: { ...state, refreshSchedulerEnabled: true } satisfies State,
			commands: List.empty(),
		}
	},

	FetchListSucceeded:
		({ maybeProducts }) =>
		state => {
			if (Option.isNone(maybeProducts)) {
				return {
					state: {
						...state,
						refreshSchedulerEnabled: false,
						productListStatus: { _tag: 'Empty' },
					} satisfies State,
					commands: List.empty(),
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

			if (state.productListStatus._tag !== 'Available') {
				return {
					commands: List.empty(),
					state: {
						...state,
						refreshSchedulerEnabled: true,
						productListStatus: {
							_tag: 'Available',
							...loadProducts,
							maybeSelectedProducts: Option.none(),
						},
					} satisfies State,
				}
			}

			return {
				commands: List.empty(),
				state: {
					...state,
					refreshSchedulerEnabled: true,
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
		},
	StartDeleteAndRefresh: message => state => {
		if (state.productListStatus._tag !== 'Available') {
			return {
				state,
				commands: List.make(
					Effect.gen(function* () {
						yield* Effect.logWarning(
							`Triggered ${message._tag} in wrong state.`,
							state.productListStatus._tag,
						)
						return InternalMessage.NoOp()
					}),
				),
			}
		}

		if (Option.isNone(state.productListStatus.maybeSelectedProducts)) {
			return {
				state,
				commands: List.make(
					Effect.gen(function* () {
						yield* Effect.logWarning(
							`Triggered ${message._tag} without any items selected.`,
							state.productListStatus._tag,
						)
						return InternalMessage.NoOp()
					}),
				),
			}
		}

		if (state.isBusy) {
			return {
				state,
				commands: List.make(
					Effect.gen(function* () {
						yield* Effect.logWarning(
							`Delete triggered while it's already deleting`,
							state.productListStatus._tag,
						)
						return InternalMessage.NoOp()
					}),
				),
			}
		}

		return {
			state: {
				...state,
				isBusy: true,
				refreshSchedulerEnabled: false,
			} satisfies State,
			commands: List.make(
				deleteProductsByIds({
					ids: state.productListStatus.maybeSelectedProducts.value,
				}),
			),
		}
	},

	DeleteAndRefreshSucceeded: message => state => {
		let commands = List.empty<Command>()

		if (state.productListStatus._tag !== 'Available') {
			commands = List.prepend(
				commands,
				Effect.gen(function* () {
					yield* Effect.logWarning(
						`Triggered ${message._tag} in state ${state.productListStatus._tag}`,
					)
					return InternalMessage.NoOp()
				}),
			)
		}

		if (Option.isNone(message.maybeProducts)) {
			return {
				state: {
					...state,
					isBusy: false,
					productListStatus: { _tag: 'Empty' },
				} satisfies State,
				commands,
			}
		}

		return {
			commands,
			state: {
				...state,
				isBusy: false,
				refreshSchedulerEnabled: true,
				productListStatus: {
					_tag: 'Available',
					total: message.maybeProducts.value.total,
					products: NonEmptyIterableHelper.map(
						message.maybeProducts.value.list,
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

	DeleteFailed: message => state => {
		let commands = List.empty<Command>()

		if (state.productListStatus._tag !== 'Available') {
			commands = List.prepend(
				commands,
				Effect.gen(function* () {
					yield* Effect.logWarning(
						`Triggered ${message._tag} in state ${state.productListStatus._tag}`,
					)
					return InternalMessage.NoOp()
				}),
			)
		}

		return {
			state: { ...state, isBusy: false, refreshSchedulerEnabled: true },
			commands,
		}
	},

	DeleteSucceededButRefreshFailed: message => state => {
		let commands = List.empty<Command>()

		if (state.productListStatus._tag !== 'Available') {
			commands = List.prepend(
				commands,
				Effect.gen(function* () {
					yield* Effect.logWarning(
						`Triggered ${message._tag} in state ${state.productListStatus._tag}`,
					)
					return InternalMessage.NoOp()
				}),
			)
		}

		return {
			commands,
			state: {
				...state,
				productListStatus: { _tag: 'Error' },
				refreshSchedulerEnabled: false,
			} satisfies State,
		}
	},

	StartFetchList: message => state => {
		if (state.isBusy) {
			return {
				state,
				commands: List.make(
					Effect.gen(function* () {
						yield* Effect.logWarning(`Triggered ${message._tag} while deleting`)
						return InternalMessage.NoOp()
					}),
				),
			}
		}

		return {
			state: { ...state, refreshSchedulerEnabled: false },
			commands: List.make(fetchList),
		}
	},
})

const makeViewModel: Effect.Effect<
	ViewModel<
		State,
		Message,
		'DeleteSucceededButRefreshFailed' | 'DeleteFailed',
		UC.All
	>
> = Effect.gen(function* () {
	const subscriptions: SM.Subscriptions<State, InternalMessage, UC.All> = [
		{
			selector: state => state.refreshSchedulerEnabled,
			create: state =>
				state.refreshSchedulerEnabled
					? Stream.schedule(
							Stream.fromEffect(fetchList),
							Schedule.spaced('20 seconds'),
						)
					: Stream.empty,
		},
	]

	const initState: State = {
		refreshSchedulerEnabled: false,
		isBusy: false,
		productListStatus: { _tag: 'Initial' },
	}

	const stateManager = yield* SM.makeStateManager({
		subscriptions,
		initState,
		initMessages: [InternalMessage.StartFetchList()],
		update,
	})

	return {
		...stateManager,
		messages: Stream.filterMap(
			stateManager.messages,
			flow(
				Match.value,
				Match.tags({
					DeleteFailed: ({ _tag }) => Option.some(_tag),
					DeleteSucceededButRefreshFailed: ({ _tag }) => Option.some(_tag),
				}),
				Match.orElse(() => Option.none()),
			),
		),
	}
})

export { makeViewModel, Message }
