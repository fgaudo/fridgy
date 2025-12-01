import * as Arr from 'effect/Array'
import * as Chunk from 'effect/Chunk'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { flow, pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'

import * as H from '@/core/helper.ts'
import * as Integer from '@/core/integer/integer.ts'
import * as PositiveInteger from '@/core/integer/positive.ts'
import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
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
	ToggleItem: { id: string }
	ClearSelected: object
	ProductListHidden: object
}>

const Message = Data.taggedEnum<Message>()

type _InternalMessage = Data.TaggedEnum<{
	NoOp: object
	FetchListFailed: {
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
	}
	FetchListSucceeded: {
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
	}
	FetchListTick: { version: number }
	FetchListTickSucceeded: {
		version: number
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
	}
	FetchListTickFailed: {
		version: number
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
	}
	DeleteAndRefreshSucceeded: {
		response: Data.TaggedEnum.Value<
			UC.DeleteAndGetProducts.Response,
			'Succeeded'
		>
	}
	DeleteAndRefreshFailed: {
		response: Data.TaggedEnum.Value<UC.DeleteAndGetProducts.Response, 'Failed'>
	}
	DeleteSucceededButRefreshFailed: {
		response: Data.TaggedEnum.Value<
			UC.DeleteAndGetProducts.Response,
			'DeleteSucceededButRefreshFailed'
		>
	}
}>

type InternalMessage = Message | _InternalMessage

const InternalMessage = Data.taggedEnum<InternalMessage>()

const deleteAndGetProducts = H.mapFunctionReturn(
	UC.DeleteAndGetProducts.DeleteAndGetProducts.run,
	Effect.map(
		Match.valueTags({
			DeleteSucceededButRefreshFailed: response =>
				InternalMessage.DeleteSucceededButRefreshFailed({ response }),
			Failed: response => InternalMessage.DeleteAndRefreshFailed({ response }),
			Succeeded: response =>
				InternalMessage.DeleteAndRefreshSucceeded({ response }),
		}),
	),
)

const fetchList = Effect.map(
	UC.GetProducts.GetProducts.run,
	Match.valueTags({
		Failed: response => InternalMessage.FetchListFailed({ response }),
		Succeeded: response => InternalMessage.FetchListSucceeded({ response }),
	}),
)

const fetchListTick = (version: number) =>
	Effect.map(
		UC.GetProducts.GetProducts.run,
		Match.valueTags({
			Failed: response =>
				InternalMessage.FetchListTickFailed({ version, response }),
			Succeeded: response =>
				InternalMessage.FetchListTickSucceeded({ version, response }),
		}),
	)

////
////

type State = Readonly<{
	fetchListSchedulerVersion: number
	isSchedulerEnabled: boolean
	isDeleting: boolean
	isStaleData: boolean
	productListStatus: Data.TaggedEnum<{
		Initial: object
		Error: object
		Empty: object
		Available: Readonly<{
			maybeSelectedProducts: Option.Option<
				NonEmptyHashSet.NonEmptyHashSet<string>
			>
			total: PositiveInteger.PositiveInteger
			products: Arr.NonEmptyReadonlyArray<
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

export type ProductDTO = Data.TaggedEnum.Value<
	State['productListStatus'],
	'Available'
>['products'][0]

const ProductDTO = Data.taggedEnum<ProductDTO>()

////
////

const matcher = Match.typeTags<
	InternalMessage,
	ReturnType<SM.Update<State, InternalMessage, UC.All>>
>()

type Command = SM.Command<InternalMessage, UC.All>

const notifyWrongState = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logError(`Triggered ${message._tag} in wrong state`)
	return InternalMessage.NoOp()
})

const notifyStale = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logInfo(`Triggered stale ${message._tag}`)
	return InternalMessage.NoOp()
})

const updateFetchListSucceeded = (
	message: Data.TaggedEnum.Value<InternalMessage, 'FetchListSucceeded'>,
	state: State,
) => {
	if (Option.isNone(message.response.maybeProducts)) {
		return {
			state: {
				...state,
				productListStatus: { _tag: 'Empty' },
			} satisfies State,
			commands: Chunk.empty(),
		}
	}

	const withProducts = {
		_tag: 'Available',
		total: message.response.maybeProducts.value.total,
		products: Arr.map(message.response.maybeProducts.value.list, product => {
			if (product._tag === 'Corrupt') {
				return ProductDTO.Corrupt({ ...product, id: Symbol() })
			}

			return product
		}),
	} satisfies Partial<State['productListStatus']>

	if (state.productListStatus._tag !== 'Available') {
		return {
			commands: Chunk.empty(),
			state: {
				...state,
				productListStatus: {
					...withProducts,
					maybeSelectedProducts: Option.none(),
				},
			} satisfies State,
		}
	}

	return {
		commands: Chunk.empty(),
		state: {
			...state,
			productListStatus: {
				...withProducts,
				maybeSelectedProducts: pipe(
					state.productListStatus.maybeSelectedProducts,
					Option.map(
						HashSet.intersection(
							pipe(
								message.response.maybeProducts.value.list,
								Arr.filter(product => product._tag !== 'Corrupt'),
								Arr.map(product => product.id),
							),
						),
					),
					Option.flatMap(NonEmptyHashSet.fromHashSet),
				),
			},
		} satisfies State,
	}
}

const updateFetchListFailed = (
	message: Data.TaggedEnum.Value<InternalMessage, 'FetchListFailed'>,
	state: State,
) => {
	if (state.productListStatus._tag !== 'Initial') {
		return {
			state: state satisfies State,
			commands: Chunk.empty(),
		}
	}

	return {
		state: {
			...state,
			productListStatus: { _tag: 'Error' },
		} satisfies State,
		commands: Chunk.empty(),
	}
}

const update: SM.Update<State, InternalMessage, UC.All> = matcher({
	NoOp: () => state => ({ state, commands: Chunk.empty() }),

	StartFetchList: message => state => {
		if (state.isDeleting) {
			return {
				state,
				commands: Chunk.make(notifyWrongState(message)),
			}
		}

		return {
			state: {
				...state,
				fetchListSchedulerVersion: state.fetchListSchedulerVersion + 1,
				isSchedulerEnabled: false,
			} satisfies State,
			commands: Chunk.make(fetchList),
		}
	},

	FetchListSucceeded: message => state =>
		pipe(updateFetchListSucceeded(message, state), result => ({
			state: {
				...result.state,
				isStaleData: false,
				isSchedulerEnabled: true,
			},
			commands: result.commands,
		})),

	FetchListFailed: message => state =>
		pipe(updateFetchListFailed(message, state), result => ({
			state: { ...result.state, isSchedulerEnabled: true },
			commands: result.commands,
		})),

	FetchListTick: message => state => {
		if (message.version !== state.fetchListSchedulerVersion) {
			return {
				state,
				commands: Chunk.make(notifyStale(message)),
			}
		}

		return {
			state,
			commands: Chunk.make(fetchListTick(message.version)),
		}
	},

	FetchListTickSucceeded: message => state => {
		if (message.version !== state.fetchListSchedulerVersion) {
			return { state, commands: Chunk.make(notifyStale(message)) }
		}

		return pipe(
			updateFetchListSucceeded(
				InternalMessage.FetchListSucceeded(message),
				state,
			),
			result => ({
				state: { ...result.state, isStaleData: false },
				commands: result.commands,
			}),
		)
	},

	FetchListTickFailed: message => state => {
		if (message.version !== state.fetchListSchedulerVersion) {
			return { state, commands: Chunk.make(notifyStale(message)) }
		}

		return updateFetchListFailed(
			InternalMessage.FetchListFailed(message),
			state,
		)
	},

	DeleteAndRefreshSucceeded: message => state =>
		pipe(
			(() => {
				let commands = Chunk.empty<Command>()

				if (state.productListStatus._tag !== 'Available') {
					commands = Chunk.append(commands, notifyWrongState(message))
				}

				if (Option.isNone(message.response.maybeProducts)) {
					return {
						state: {
							...state,
							productListStatus: { _tag: 'Empty' },
						} satisfies State,
						commands,
					}
				}

				return {
					commands,
					state: {
						...state,
						productListStatus: {
							_tag: 'Available',
							total: message.response.maybeProducts.value.total,
							products: Arr.map(
								message.response.maybeProducts.value.list,
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
			})(),
			result => ({
				state: { ...result.state, isDeleting: false, isStaleData: false },
				commands: result.commands,
			}),
		),

	DeleteAndRefreshFailed: message => state => {
		let commands = Chunk.empty<Command>()

		if (state.productListStatus._tag !== 'Available') {
			commands = Chunk.append(commands, notifyWrongState(message))
		}

		return {
			state: { ...state, isDeleting: false } satisfies State,
			commands,
		}
	},

	DeleteSucceededButRefreshFailed: message => state => {
		let commands = Chunk.empty<Command>()

		if (state.productListStatus._tag !== 'Available') {
			commands = Chunk.append(commands, notifyWrongState(message))
		}

		return {
			commands,
			state: {
				...state,
				isStaleData: true,
				isDeleting: false,
			} satisfies State,
		}
	},

	StartDeleteAndRefresh: message => state => {
		if (
			state.productListStatus._tag !== 'Available' ||
			Option.isNone(state.productListStatus.maybeSelectedProducts) ||
			state.isDeleting
		) {
			return {
				state,
				commands: Chunk.make(notifyWrongState(message)),
			}
		}

		return {
			state: {
				...state,
				isDeleting: true,
				fetchListSchedulerVersion: state.fetchListSchedulerVersion + 1,
				isSchedulerEnabled: false,
			} satisfies State,
			commands: Chunk.make(
				deleteAndGetProducts({
					ids: state.productListStatus.maybeSelectedProducts.value,
				}),
			),
		}
	},

	ToggleItem: message => state => {
		if (state.productListStatus._tag !== 'Available') {
			return {
				state,
				commands: Chunk.make(notifyWrongState(message)),
			}
		}

		return {
			state: {
				...state,
				productListStatus: {
					...state.productListStatus,
					maybeSelectedProducts: pipe(
						state.productListStatus.maybeSelectedProducts,
						Option.match({
							onSome: HashSet.toggle(message.id),
							onNone: () => HashSet.make(message.id),
						}),
						NonEmptyHashSet.fromHashSet,
					),
				},
			} satisfies State,
			commands: Chunk.empty(),
		}
	},

	ClearSelected: message => state => {
		if (
			state.productListStatus._tag !== 'Available' ||
			Option.isNone(state.productListStatus.maybeSelectedProducts)
		) {
			return {
				state,
				commands: Chunk.make(notifyWrongState(message)),
			}
		}

		return {
			state: {
				...state,
				productListStatus: {
					...state.productListStatus,
					maybeSelectedProducts: Option.none(),
				},
			} satisfies State,
			commands: Chunk.empty(),
		}
	},

	ProductListHidden: () => state => ({
		state: {
			...state,
			isSchedulerEnabled: false,
			fetchListSchedulerVersion: state.fetchListSchedulerVersion + 1,
		} satisfies State,
		commands: Chunk.empty(),
	}),
})

const hasFreshProducts = (
	products: (State['productListStatus'] & { _tag: 'Available' })['products'],
): boolean =>
	products.some(
		product => product._tag === 'Valid' && product.status._tag === 'Fresh',
	)

const fetchListStream = (version: number) =>
	pipe(
		Stream.make(InternalMessage.FetchListTick({ version })),
		Stream.schedule(Schedule.spaced('1 second')),
		Stream.forever,
	)

const fetchListScheduler: SM.Subscription<State, InternalMessage, UC.All> = {
	init: state => {
		if (!state.isSchedulerEnabled) {
			return SM.keyedEmptyStream
		}

		if (state.productListStatus._tag !== 'Available') {
			return SM.keyedEmptyStream
		}

		if (!hasFreshProducts(state.productListStatus.products)) {
			return SM.keyedEmptyStream
		}

		return {
			key: true,
			stream: fetchListStream(state.fetchListSchedulerVersion),
		}
	},

	update: ({ current, previous, active }) => {
		if (!current.isSchedulerEnabled) {
			return SM.keyedEmptyStream
		}

		if (current.productListStatus._tag !== 'Available') {
			return SM.keyedEmptyStream
		}

		if (current.productListStatus === previous.productListStatus) {
			return active
		}

		if (
			current.productListStatus._tag === previous.productListStatus._tag &&
			current.productListStatus.products === previous.productListStatus.products
		) {
			return active
		}

		if (!hasFreshProducts(current.productListStatus.products)) {
			return SM.keyedEmptyStream
		}

		return {
			key: true,
			stream: fetchListStream(current.fetchListSchedulerVersion),
		}
	},
}

const initState: State = {
	fetchListSchedulerVersion: 0,
	isStaleData: false,
	isSchedulerEnabled: false,
	isDeleting: false,
	productListStatus: { _tag: 'Initial' },
}

const makeViewModel: Effect.Effect<
	ViewModel<
		State,
		Message,
		'DeleteSucceededButRefreshFailed' | 'DeleteAndRefreshFailed',
		UC.All
	>
> = Effect.gen(function* () {
	const stateManager = yield* SM.makeStateManager({
		subscriptions: [fetchListScheduler],
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
					DeleteAndRefreshFailed: ({ _tag }) => Option.some(_tag),
					DeleteSucceededButRefreshFailed: ({ _tag }) => Option.some(_tag),
				}),
				Match.orElse(() => Option.none()),
			),
		),
	}
})

export { makeViewModel, Message }
