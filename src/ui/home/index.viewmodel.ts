import * as Arr from 'effect/Array'
import * as Brand from 'effect/Brand'
import * as Chunk from 'effect/Chunk'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { flow, pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Layer from 'effect/Layer'
import * as Match from 'effect/Match'
import * as Newtype from 'effect/Newtype'
import * as Opt from 'effect/Option'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'
import * as Struct from 'effect/Struct'
import * as T from 'effect/Tuple'

import { UseCase as UC } from '@/business/index.ts'
import * as Integer from '@/core/integer/integer.ts'
import * as PositiveInteger from '@/core/integer/positive.ts'
import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as StateManager from '@/core/state-manager.ts'
import * as UnitInterval from '@/core/unit-interval.ts'
import type { ViewModel } from '@/core/viewmodel.ts'

import { HOME_SCHEDULER_FREQUENCY } from './constants.ts'

type Model = Readonly<{
	isFetching: boolean
	canNavigateOut: boolean
	canFetch: Data.TaggedEnum<{
		True: { fetch: MessageImpl }
		False: object
	}>
	productListStatus: Data.TaggedEnum<{
		Initial: object
		Error: object
		Empty: object
		Available: Readonly<{
			isDeleting: boolean
			canDelete: Data.TaggedEnum<{
				True: {
					deleteSelected: MessageImpl
				}
				False: object
			}>
			canClearSelection: Data.TaggedEnum<{
				True: {
					clear: MessageImpl
				}
				False: object
			}>
			total: PositiveInteger.PositiveInteger
			products: Arr.NonEmptyReadonlyArray<
				Data.TaggedEnum<{
					Corrupt: Readonly<{
						canToggle: { _tag: 'False' }
						maybeName: Opt.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
					}>
					Invalid: Readonly<{
						canToggle: { _tag: 'True'; toggle: Message } | { _tag: 'False' }
						selected: boolean
						id: string
						maybeName: Opt.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
					}>
					Valid: Readonly<{
						canToggle: { _tag: 'True'; toggle: Message } | { _tag: 'False' }
						id: string
						selected: boolean
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

export type MessageImpl = Data.TaggedEnum<{
	StartFetchList: object
	StartDeleteAndRefresh: object
	ToggleItem: { id: string }
	ClearSelected: object
	Crash: { error: unknown }
	NoOp: object
	FetchListFailed: {
		version: FetchListVersion
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
	}
	FetchListSucceeded: {
		version: FetchListVersion
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
	}
	FetchListTick: { version: FetchListSchedulerVersion }
	FetchListTickSucceeded: {
		version: FetchListSchedulerVersion
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
	}
	FetchListTickFailed: {
		version: FetchListSchedulerVersion
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
	}
	DeleteAndRefreshSucceeded: {
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
	}
	DeleteAndRefreshFailed: {
		response: Data.TaggedEnum.Value<UC.DeleteProductsByIds.Response, 'Failed'>
	}
	DeleteSucceededButRefreshFailed: {
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
	}
}>
const MessageImpl = Data.taggedEnum<MessageImpl>()

type Message = Newtype.Newtype<'Message', MessageImpl>
const messageIso = Newtype.makeIso<Message>()

export type State = Readonly<{
	fetchListSchedulerVersion: FetchListSchedulerVersion
	fetchListVersion: FetchListVersion
	isManualFetching: boolean
	isFetching: boolean
	productListStatus: Data.TaggedEnum<{
		Initial: object
		Error: object
		Empty: object
		Available: Readonly<{
			isDeleting: boolean
			maybeSelectedProducts: Opt.Option<NonEmptyHashSet.NonEmptyHashSet<string>>
			total: PositiveInteger.PositiveInteger
			products: Arr.NonEmptyReadonlyArray<
				Data.TaggedEnum<{
					Corrupt: Readonly<{
						maybeName: Opt.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
						id: symbol
					}>
					Invalid: Readonly<{
						id: string
						maybeName: Opt.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
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

type ProductDTO = Data.TaggedEnum.Value<
	State['productListStatus'],
	'Available'
>['products'][0]

const ProductDTO = Data.taggedEnum<ProductDTO>()

function updateFetchListSucceeded(
	message: Data.TaggedEnum.Value<MessageImpl, 'FetchListSucceeded'>,
	state: State,
) {
	if (message.response.maybeProducts.length <= 0) {
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

	if (!isInAvailable(state)) {
		return {
			commands: Chunk.empty(),
			state: {
				...state,
				productListStatus: {
					isDeleting: false,
					...withProducts,
					maybeSelectedProducts: Opt.none(),
				},
			} satisfies State,
		}
	}

	return {
		commands: Chunk.empty(),
		state: {
			...state,
			productListStatus: {
				...state.productListStatus,
				...withProducts,
				maybeSelectedProducts: pipe(
					state.productListStatus.maybeSelectedProducts,
					Opt.map(
						HashSet.intersection(
							pipe(
								message.response.maybeProducts,
								Arr.filter(product => product._tag !== 'Corrupt'),
								Arr.map(product => product.id),
							),
						),
					),
					Opt.flatMap(NonEmptyHashSet.make),
				),
			},
		} satisfies State,
	}
}

function updateFetchListFailed(
	message: Data.TaggedEnum.Value<MessageImpl, 'FetchListFailed'>,
	state: State,
) {
	if (isInitial(state)) {
		return {
			state,
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

export const update = Match.typeTags<
	MessageImpl,
	ReturnType<StateManager.Update<State, MessageImpl, UC.All>>
>()({
	Crash: error => state =>
		T.make(state, [Effect.logFatal(error).pipe(Effect.as(MessageImpl.NoOp()))]),

	NoOp: () => state => T.make(state, []),

	StartFetchList: message => state => {
		if (!isManualFetchingAllowed(state)) {
			return T.make(state, [notifyWrongState(message)])
		}

		const nextFetchVersion = FetchListVersion.increment(state.fetchListVersion)

		return T.make(
			Struct.evolve(state, {
				fetchListSchedulerVersion: FetchListSchedulerVersion.increment,
				fetchListVersion: () => nextFetchVersion,
				isManualFetching: () => true,
				isFetching: () => true,
			}),

			[fetchList(nextFetchVersion)],
		)
	},

	FetchListSucceeded: message => state => {
		if (state.fetchListVersion !== message.version) {
			return T.make(state, [notifyStale(message)])
		}

		if (!isManualFetching(state)) {
			return T.make(state, [notifyWrongState(message)])
		}

		return pipe(updateFetchListSucceeded(message, state), result =>
			T.make(
				Struct.evolve(result.state, {
					isManualFetching: () => false,
					isFetching: () => false,
				}),
				result.commands,
			),
		)
	},

	FetchListFailed: message => state => {
		if (state.fetchListVersion !== message.version) {
			return T.make(state, [notifyStale(message)])
		}

		if (!isManualFetching(state)) {
			return T.make(state, [notifyWrongState(message)])
		}

		return pipe(updateFetchListFailed(message, state), result =>
			T.make(
				Struct.evolve(result.state, {
					isManualFetching: () => false,
					isFetching: () => false,
				}),

				result.commands,
			),
		)
	},

	FetchListTick: message => state => {
		if (message.version !== state.fetchListSchedulerVersion) {
			return T.make(state, [notifyStale(message)])
		}

		if (!isSchedulerFetchingAllowed(state)) {
			return T.make(state, [notifyWrongState(message)])
		}

		return T.make(
			Struct.evolve(state, {
				isFetching: () => true,
			}),
			[fetchListTick(message.version)],
		)
	},

	FetchListTickSucceeded: message => state => {
		if (message.version !== state.fetchListSchedulerVersion) {
			return T.make(state, [notifyStale(message)])
		}

		if (!isFetching(state)) {
			return T.make(state, [notifyWrongState(message)])
		}

		return pipe(
			updateFetchListSucceeded(
				MessageImpl.FetchListSucceeded({
					response: message.response,
					version: state.fetchListVersion,
				}),
				state,
			),
			result =>
				T.make(
					Struct.evolve(result.state, {
						isFetching: () => false,
					}),
					result.commands,
				),
		)
	},

	FetchListTickFailed: message => state => {
		if (message.version !== state.fetchListSchedulerVersion) {
			return T.make(state, [notifyStale(message)])
		}

		if (!isFetching(state)) {
			return T.make(state, [notifyWrongState(message)])
		}

		return pipe(
			updateFetchListFailed(
				MessageImpl.FetchListFailed({
					response: message.response,
					version: state.fetchListVersion,
				}),
				state,
			),
			result =>
				T.make(
					Struct.evolve(state, { isFetching: () => false }),
					result.commands,
				),
		)
	},

	StartDeleteAndRefresh: message => state => {
		if (!isDeletingAllowed(state)) {
			return T.make(state, [notifyWrongState(message)])
		}

		return T.make(
			Struct.evolve(state, {
				isFetching: () => true,
				productListStatus: Struct.evolve({
					isDeleting: () => true,
				}),
				isManualFetching: () => true,
				fetchListSchedulerVersion: fetchListSchedulerVersion =>
					FetchListSchedulerVersion.increment(fetchListSchedulerVersion),
				fetchListVersion: fetchListVersion =>
					FetchListVersion.increment(fetchListVersion),
			}),
			[
				deleteAndGetProducts({
					ids: state.productListStatus.maybeSelectedProducts.value,
				}),
			],
		)
	},

	DeleteAndRefreshSucceeded: message => state => {
		if (!isDeleting(state)) {
			return T.make(state, [notifyWrongState(message)])
		}

		const maybeProducts = message.response.maybeProducts

		if (Opt.isNone(maybeProducts)) {
			return T.make(
				Struct.evolve(state, {
					isFetching: () => false,
					isManualFetching: () => false,
					productListStatus: Struct.evolve({
						_tag: () => 'Empty' as const,
					}),
				}),
				[],
			)
		}

		return T.make(
			Struct.evolve(state, {
				isFetching: () => false,
				isManualFetching: () => false,
				productListStatus: Struct.evolve({
					_tag: () => 'Available' as const,
					isDeleting: () => false,
					total: () => maybeProducts.value.length,
					products: () =>
						Arr.map(maybeProducts.value, product => {
							if (product._tag === 'Invalid') {
								if (Opt.isNone(product.id)) {
									return ProductDTO.Corrupt({ ...product, id: Symbol() })
								}

								return ProductDTO.Invalid({
									...product,
									id: product.id.value,
								})
							}

							return ProductDTO.Valid({ ...product })
						}),
					maybeSelectedProducts: () => Opt.none(),
				}),
			}),
			[],
		)
	},
	DeleteAndRefreshFailed: message => state => {
		if (!isDeleting(state)) {
			return T.make(state, [notifyWrongState(message)])
		}

		return T.make(
			Struct.evolve(state, {
				productListStatus: Struct.evolve({ isDeleting: () => false }),
				isFetching: () => false,
				isManualFetching: () => false,
			}),
			[],
		)
	},

	DeleteSucceededButRefreshFailed: message => state => {
		if (!isDeleting(state)) {
			return T.make(state, [notifyWrongState(message)])
		}

		return T.make(
			Struct.evolve(state, {
				productListStatus: Struct.evolve({
					_tag: () => 'Error' as const,
				}),
				isManualFetching: () => false,
				isFetching: () => false,
			}),
			[],
		)
	},

	ToggleItem: message => state => {
		if (!productsAreToggleable(state)) {
			return T.make(state, [notifyWrongState(message)])
		}

		return T.make(
			Struct.evolve(state, {
				productListStatus: Struct.evolve({
					maybeSelectedProducts: flow(
						Opt.match({
							onSome: HashSet.has(message.id)
								? HashSet.remove(message.id)
								: HashSet.add(message.id),
							onNone: () => HashSet.make(message.id),
						}),
						NonEmptyHashSet.make,
					),
				}),
			}),
			[],
		)
	},

	ClearSelected: message => state => {
		if (!isSelectionClearable(state)) {
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
					maybeSelectedProducts: Opt.none(),
				},
			} satisfies State,
			commands: Chunk.empty(),
		}
	},
})

function fetchListStream(version: FetchListSchedulerVersion) {
	return pipe(
		Stream.make(MessageImpl.FetchListTick({ version })),
		Stream.schedule(Schedule.spaced(HOME_SCHEDULER_FREQUENCY)),
		Stream.forever,
	)
}

export function evaluateSubscriptions(
	state: State,
): StateManager.Subscriptions<MessageImpl, UC.All> {
	if (!isSchedulerFetchingAllowed(state)) {
		return HashMap.empty()
	}

	return HashMap.make([
		state.fetchListSchedulerVersion,
		fetchListStream(state.fetchListSchedulerVersion),
	])
}

export type FetchListSchedulerVersion = Brand.Branded<
	bigint,
	'FetchListSchedulerVersion'
>
const _FetchListSchedulerVersion = Brand.nominal<FetchListSchedulerVersion>()
export const FetchListSchedulerVersion = {
	make: _FetchListSchedulerVersion,
	increment: (version: FetchListSchedulerVersion) =>
		_FetchListSchedulerVersion(version + 1n),
}

export type FetchListVersion = Brand.Branded<bigint, 'FetchListVersion'>
export const _FetchListVersion = Brand.nominal<FetchListVersion>()
export const FetchListVersion = {
	make: _FetchListVersion,
	increment: (version: FetchListVersion) => _FetchListVersion(version + 1n),
}

const initState: State = {
	fetchListVersion: FetchListVersion.make(0n),
	fetchListSchedulerVersion: FetchListSchedulerVersion.make(0n),
	isFetching: false,
	isManualFetching: false,
	productListStatus: { _tag: 'Initial' },
}

type IsInAvailable = State & { productListStatus: { _tag: 'Available' } }
type isNotInAvailable = State & {
	productListStatus: Exclude<State['productListStatus'], { _tag: 'Available' }>
}

export function isInAvailable(state: State): state is State & IsInAvailable {
	return state.productListStatus._tag === 'Available'
}

export function isEmpty(
	state: State,
): state is State & { productListStatus: { _tag: 'Empty' } } {
	return state.productListStatus._tag === 'Empty'
}

export function isError(
	state: State,
): state is State & { productListStatus: { _tag: 'Error' } } {
	return state.productListStatus._tag === 'Error'
}

export function isInitial(
	state: State,
): state is State & { productListStatus: { _tag: 'Initial' } } {
	return state.productListStatus._tag === 'Initial'
}

/** @remarks
 *  Time complexity: O(n) in the worst case.
 *  Could be improved with a cached hasFreshProducts stored in the state
 */
export function hasFreshProducts(state: State): state is IsInAvailable {
	return (
		isInAvailable(state) &&
		state.productListStatus.products.some(
			product => product._tag === 'Valid' && product.status._tag === 'Fresh',
		)
	)
}

type HasSelectedProducts = State &
	IsInAvailable & {
		productListStatus: {
			maybeSelectedProducts: Opt.Some<
				Opt.Option.Value<
					Data.TaggedEnum.Value<
						State['productListStatus'],
						'Available'
					>['maybeSelectedProducts']
				>
			>
		}
	}

export function hasSelectedProducts(
	state: State,
): state is IsInAvailable & HasSelectedProducts {
	return (
		isInAvailable(state) &&
		Opt.isSome(state.productListStatus.maybeSelectedProducts)
	)
}

type IsDeleting = State &
	IsInAvailable & {
		productListStatus: { isDeleting: true }
	}

type IsNotDeleting = State &
	IsInAvailable & {
		productListStatus: { isDeleting: false }
	}

export function isDeleting(state: State): state is IsInAvailable & IsDeleting {
	return isInAvailable(state) && state.productListStatus.isDeleting
}

type IsFetching = State & {
	isFetching: true
}

export function isFetching(state: State): state is IsFetching {
	return state.isFetching
}

type IsManualFetching = State & {
	isFetching: true
	isManualFetching: true
}

type IsNotManualFetching = State &
	(
		| {
				isFetching: false
				isManualFetching: false
		  }
		| {
				isFetching: true
				isManualFetching: false
		  }
	)

export function isManualFetching(
	state: State,
): state is IsFetching & IsManualFetching {
	return isFetching(state) && state.isManualFetching
}

export function productsAreToggleable(
	state: State,
): state is IsInAvailable & IsNotManualFetching & IsNotDeleting {
	return isInAvailable(state) && !isManualFetching(state) && !isDeleting(state)
}

export function isDeletingAllowed(
	state: State,
): state is IsInAvailable &
	IsNotManualFetching &
	IsNotDeleting &
	HasSelectedProducts {
	return (
		isInAvailable(state) &&
		!isManualFetching(state) &&
		!isDeleting(state) &&
		hasSelectedProducts(state)
	)
}

export function isManualFetchingAllowed(
	state: State,
): state is IsNotDeleting | isNotInAvailable {
	return !isDeleting(state) || !isInAvailable(state)
}

export function isSchedulerFetchingAllowed(
	state: State,
): state is IsInAvailable & IsNotDeleting & IsNotManualFetching {
	return (
		isInAvailable(state) &&
		!isDeleting(state) &&
		!isManualFetching(state) &&
		hasFreshProducts(state)
	)
}

export function isSelectionClearable(
	state: State,
): state is IsInAvailable & IsNotDeleting & HasSelectedProducts {
	return (
		isInAvailable(state) && !isDeleting(state) && hasSelectedProducts(state)
	)
}

function makeModel(state: State): Model {
	const isFetching = state.isFetching || state.isManualFetching

	const canFetch =
		!state.isManualFetching &&
		state.productListStatus._tag === 'Available' &&
		!state.productListStatus.isDeleting
			? ({
					_tag: 'True',
					fetch: MessageImpl.StartFetchList(),
				} as const)
			: ({ _tag: 'False' } as const)

	if (state.productListStatus._tag !== 'Available') {
		return {
			...state,
			canNavigateOut: true,
			isFetching,
			canFetch,
			productListStatus: state.productListStatus,
		}
	}

	const status = state.productListStatus
	const maybeSelected = status.maybeSelectedProducts

	const canDelete = isDeletingAllowed({
		...state,
		productListStatus: status,
	})
		? ({
				_tag: 'True',
				deleteSelected: MessageImpl.StartDeleteAndRefresh(),
			} as const)
		: ({ _tag: 'False' } as const)

	const canClearSelection = isSelectionClearable({
		...state,
		productListStatus: status,
	})
		? ({
				_tag: 'True',
				clear: MessageImpl.ClearSelected(),
			} as const)
		: ({ _tag: 'False' } as const)

	const products = Arr.map(status.products, product =>
		product._tag === 'Corrupt'
			? {
					...product,
					canToggle: { _tag: 'False' } as const,
				}
			: {
					...product,
					canToggle: status.isDeleting
						? ({ _tag: 'False' } as const)
						: ({
								_tag: 'True',
								toggle: MessageImpl.ToggleItem({ id: product.id }),
							} as const),
					selected: pipe(
						maybeSelected,
						Opt.map(HashSet.has(product.id)),
						Opt.getOrElse(() => false),
					),
				},
	)

	return {
		...state,
		isFetching,
		canFetch,
		canNavigateOut:
			!state.productListStatus.isDeleting &&
			Opt.isNone(state.productListStatus.maybeSelectedProducts),
		productListStatus: {
			...status,
			canClearSelection,
			canDelete,
			products,
		},
	}
}

const notifyWrongState = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logError(`Triggered ${message._tag} in wrong state`)
	return MessageImpl.NoOp()
})

const notifyStale = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logInfo(`Triggered stale ${message._tag}`)
	return MessageImpl.NoOp()
})

const deleteAndGetProducts = Effect.fn(function* (
	params: Parameters<UC.DeleteProductsByIds.DeleteProductsByIds['Service']>[0],
) {
	const deleteProducts = yield* UC.DeleteProductsByIds.DeleteProductsByIds

	{
		const result = yield* deleteProducts(params)

		if (result._tag === 'Failed') {
			return MessageImpl.DeleteAndRefreshFailed({ response: result })
		}
	}

	const { run } = yield* UC.GetProducts.GetProducts

	const result = yield* run

	return Match.valueTags(result, {
		Failed: response =>
			MessageImpl.DeleteSucceededButRefreshFailed({ response }),
		Succeeded: response => MessageImpl.DeleteAndRefreshSucceeded({ response }),
	})
})

const fetchList = Effect.fn(function* (version: FetchListVersion) {
	const { run } = yield* UC.GetProducts.GetProducts

	const result = yield* run

	return Match.valueTags(result, {
		Failed: response => MessageImpl.FetchListFailed({ version, response }),
		Succeeded: response =>
			MessageImpl.FetchListSucceeded({ version, response }),
	})
})

const fetchListTick = Effect.fn(function* (version: FetchListSchedulerVersion) {
	const { run } = yield* UC.GetProducts.GetProducts

	const result = yield* run

	return Match.valueTags(result, {
		Failed: response => MessageImpl.FetchListTickFailed({ version, response }),
		Succeeded: response =>
			MessageImpl.FetchListTickSucceeded({ version, response }),
	})
})
