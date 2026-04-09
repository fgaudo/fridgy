import * as Arr from 'effect/Array'
import * as Brand from 'effect/Brand'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'

import { UseCase as UC } from '@/business/index.ts'
import type * as Integer from '@/core/integer/integer.ts'
import type * as PositiveInteger from '@/core/integer/positive-integer.ts'
import * as ArrX from '@/core/non-empty-array.ts'
import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
import type * as StateManager from '@/core/state-manager.ts'
import type * as UnitInterval from '@/core/unit-interval.ts'

import { Message } from '../messages.ts'

export type UseCases =
	| UC.DeleteProductsByIds.DeleteProductsByIds
	| UC.GetProducts.GetProducts

export type Model = Readonly<{
	canNavigateOut: boolean
	canFetch: Data.TaggedEnum<{
		True: Readonly<{ fetch: Message }>
		False: object
	}>
	productListStatus: Data.TaggedEnum<{
		Initial: { activity: 'fetching' }
		Error: { activity: 'fetching' | 'idle' }
		Empty: { activity: 'fetching' | 'idle' }
		Available: Readonly<{
			activity: 'fetching' | 'idle' | 'deleting'
			canDeleteSelected: Data.TaggedEnum<{
				True: Readonly<{
					deleteMessage: Message
				}>
				False: object
			}>
			canClearSelection: Data.TaggedEnum<{
				True: Readonly<{
					clearMessage: Message
				}>
				False: object
			}>
			total: PositiveInteger.PositiveInteger
			products: Arr.NonEmptyReadonlyArray<
				Data.TaggedEnum<{
					Corrupt: Readonly<{
						canToggle: Data.TaggedEnum<{ False: object }>
						maybeName: Opt.Option<string>
					}>
					Invalid: Readonly<{
						canToggle: Data.TaggedEnum<{
							True: Readonly<{ message: Message }>
							False: object
						}>
						selected: boolean
						id: string
						maybeName: Opt.Option<string>
					}>
					Valid: Readonly<{
						canToggle: Data.TaggedEnum<{
							True: Readonly<{ message: Message }>
							False: object
						}>
						id: string
						isSelected: boolean
						name: string
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

export type State = Readonly<{
	versions: {
		scheduledFetcher: FetchListSchedulerVersion
		manualFetcher: FetchListVersion
	}
	productListData: Data.TaggedEnum<{
		Initial: { activity: 'fetching' }
		Error: { activity: 'fetching' | 'idle' }
		Empty: { activity: 'fetching' | 'idle' }
		Available: Readonly<{
			activity: 'scheduledFetching' | 'idle' | 'deleting' | 'fetching'
			maybeSelectedProducts: Opt.Option<NonEmptyHashSet.NonEmptyHashSet<string>>
			total: PositiveInteger.PositiveInteger
			hasFreshProducts: boolean
			products: Arr.NonEmptyReadonlyArray<
				Data.TaggedEnum<{
					Corrupt: Readonly<{
						maybeName: Opt.Option<string>
						id: symbol
					}>
					Invalid: Readonly<{
						id: string
						maybeName: Opt.Option<string>
					}>
					Valid: Readonly<{
						id: string
						name: string
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
	State['productListData'],
	'Available'
>['products'][0]
const ProductDTO = Data.taggedEnum<ProductDTO>()

function updateFetchListSucceeded(
	state: State,
	maybeProducts: Data.TaggedEnum.Value<
		Message,
		'Home_FetchListSucceeded'
	>['response']['maybeProducts'],
) {
	if (Opt.isNone(maybeProducts)) {
		return T.make(
			{
				...state,
				productListData: {
					...state.productListData,
					_tag: 'Empty' as const,
					activity: 'idle' as const,
				},
			},
			[],
		)
	}
	const mappedProducts = Arr.map(maybeProducts.value, product => {
		if (product._tag === 'Invalid') {
			return ProductDTO.Corrupt({ ...product, id: Symbol('id') })
		}
		return product
	})
	const hasFreshProducts = Arr.some(
		mappedProducts,
		p => p._tag === 'Valid' && p.status._tag === 'Fresh',
	)
	if (state.productListData._tag !== 'Available') {
		return T.make(
			{
				...state,
				productListData: {
					...state.productListData,
					hasFreshProducts,
					_tag: 'Available' as const,
					activity: 'idle' as const,
					total: ArrX.length(maybeProducts.value),
					products: mappedProducts,
					maybeSelectedProducts: Opt.none(),
				},
			} satisfies State,
			[],
		)
	}
	return T.make(
		{
			...state,
			productListData: {
				...state.productListData,
				activity: 'idle' as const,
				total: ArrX.length(maybeProducts.value),
				products: mappedProducts,
				hasFreshProducts,
				maybeSelectedProducts: state.productListData.maybeSelectedProducts.pipe(
					Opt.bindTo('selectedProducts'),
					Opt.bind('newProducts', () =>
						maybeProducts.pipe(
							Opt.map(Arr.filter(product => product._tag !== 'Invalid')),
							Opt.map(Arr.map(product => product.id)),
							Opt.map(HashSet.make),
						),
					),
					Opt.map(({ selectedProducts, newProducts }) =>
						HashSet.intersection(newProducts, selectedProducts),
					),
					Opt.andThen(NonEmptyHashSet.make),
				),
			},
		},
		[],
	)
}

function updateFetchListFailed(state: State) {
	if (state.productListData._tag === 'Initial') {
		return T.make(state, [])
	}
	return T.make(
		{
			...state,
			productListData: {
				...state.productListData,
				_tag: 'Error' as const,
				activity: 'idle' as const,
			},
		},
		[],
	)
}

function isSchedulerRunning(
	state: State,
): state is State & { productListData: { _tag: 'Available' } } {
	const productListData = state.productListData
	return (
		productListData._tag === 'Available' &&
		(productListData.activity === 'scheduledFetching' ||
			productListData.activity === 'idle') &&
		productListData.hasFreshProducts
	)
}

export const update = Match.typeTags<
	Extract<Message, Record<'_tag', `Home_${string}`>>,
	ReturnType<StateManager.Update<State, Message, UseCases>>
>()({
	Home_StartFetchList: message => state => {
		if (
			state.productListData.activity !== 'idle' &&
			state.productListData.activity !== 'scheduledFetching'
		) {
			return T.make(state, [notifyWrongState(message)])
		}
		const nextFetchVersion = FetchListVersion.increment(
			state.versions.manualFetcher,
		)
		return T.make(
			{
				...state,
				versions: {
					...state.versions,
					scheduledFetcher: FetchListSchedulerVersion.increment(
						state.versions.scheduledFetcher,
					),
					manualFetcher: nextFetchVersion,
				},
				productListData: {
					...state.productListData,
					activity: 'fetching' as const,
				},
			},
			T.make(fetchList(nextFetchVersion)),
		)
	},

	Home_FetchListSucceeded: message => state => {
		if (state.versions.manualFetcher !== message.version) {
			return T.make(state, [notifyStale(message)])
		}
		if (state.productListData.activity !== 'fetching') {
			return T.make(state, [notifyWrongState(message)])
		}
		return updateFetchListSucceeded(state, message.response.maybeProducts)
	},

	Home_FetchListFailed: message => state => {
		if (state.versions.manualFetcher !== message.version) {
			return T.make(state, [notifyStale(message)])
		}
		if (state.productListData.activity !== 'fetching') {
			return T.make(state, [notifyWrongState(message)])
		}
		return updateFetchListFailed(state)
	},

	Home_FetchListTick: message => state => {
		if (message.version !== state.versions.scheduledFetcher) {
			return T.make(state, [notifyStale(message)])
		}
		if (!isSchedulerRunning(state)) {
			return T.make(state, [notifyWrongState(message)])
		}
		return T.make(
			{
				...state,
				productListData: {
					...state.productListData,
					activity: 'scheduledFetching' as const,
				},
			},
			[fetchListTick(message.version)],
		)
	},

	Home_FetchListTickSucceeded: message => state => {
		if (message.version !== state.versions.scheduledFetcher) {
			return T.make(state, [notifyStale(message)])
		}
		if (
			state.productListData.activity !== 'scheduledFetching' ||
			!isSchedulerRunning(state)
		) {
			return T.make(state, [notifyWrongState(message)])
		}
		return updateFetchListSucceeded(state, message.response.maybeProducts)
	},

	Home_FetchListTickFailed: message => state => {
		if (message.version !== state.versions.scheduledFetcher) {
			return T.make(state, [notifyStale(message)])
		}
		if (
			state.productListData.activity !== 'scheduledFetching' ||
			!isSchedulerRunning(state)
		) {
			return T.make(state, [notifyWrongState(message)])
		}
		return updateFetchListFailed(state)
	},

	Home_StartDeleteAndRefresh: message => state => {
		if (
			state.productListData._tag !== 'Available' ||
			state.productListData.activity === 'fetching' ||
			state.productListData.activity === 'deleting'
		) {
			return T.make(state, [notifyWrongState(message)])
		}
		if (Opt.isNone(state.productListData.maybeSelectedProducts)) {
			return T.make(state, [notifyWrongState(message)])
		}
		return T.make(
			{
				...state,
				versions: {
					...state.versions,
					manualFetcher: FetchListVersion.increment(
						state.versions.manualFetcher,
					),
					scheduledFetcher: FetchListSchedulerVersion.increment(
						state.versions.scheduledFetcher,
					),
				},
				productListData: {
					...state.productListData,
					activity: 'deleting' as const,
				},
			},
			[
				deleteAndGetProducts({
					ids: state.productListData.maybeSelectedProducts.value,
				}),
			],
		)
	},

	Home_DeleteAndRefreshSucceeded: message => state => {
		if (state.productListData.activity !== 'deleting') {
			return T.make(state, [notifyWrongState(message)])
		}
		return updateFetchListSucceeded(state, message.response.maybeProducts)
	},

	Home_DeleteAndRefreshFailed: message => state => {
		if (state.productListData.activity !== 'deleting') {
			return T.make(state, [notifyWrongState(message)])
		}
		return T.make(
			{
				...state,
				productListData: {
					...state.productListData,
					activity: 'idle' as const,
				},
			},
			[],
		)
	},

	Home_DeleteSucceededButRefreshFailed: message => state => {
		if (state.productListData.activity !== 'deleting') {
			return T.make(state, [notifyWrongState(message)])
		}
		return T.make(
			{
				...state,
				productListData: {
					...state.productListData,
					_tag: 'Error' as const,
					activity: 'idle' as const,
				},
			},
			[],
		)
	},

	Home_ToggleItem: message => state => {
		if (
			state.productListData._tag !== 'Available' ||
			(state.productListData.activity !== 'idle' &&
				state.productListData.activity !== 'scheduledFetching')
		) {
			return T.make(state, [notifyWrongState(message)])
		}
		return T.make(
			{
				...state,
				productListData: {
					...state.productListData,
					maybeSelectedProducts:
						state.productListData.maybeSelectedProducts.pipe(
							Opt.match({
								onSome: map =>
									HashSet.has(map, message.id)
										? HashSet.remove(map, message.id)
										: HashSet.add(map, message.id),
								onNone: () => HashSet.make(message.id),
							}),
							NonEmptyHashSet.make,
						),
				},
			},
			[],
		)
	},

	Home_ClearSelected: message => state => {
		if (
			(state.productListData.activity !== 'idle' &&
				state.productListData.activity !== 'scheduledFetching') ||
			state.productListData._tag !== 'Available' ||
			Opt.isNone(state.productListData.maybeSelectedProducts)
		) {
			return T.make(state, [notifyWrongState(message)])
		}
		return T.make(
			{
				...state,
				productListData: {
					...state.productListData,
					maybeSelectedProducts: Opt.none(),
				},
			},
			[],
		)
	},
})

export const subscriptions: StateManager.Subscriptions<
	State,
	Message,
	UseCases
> = state => {
	if (!isSchedulerRunning(state)) {
		return HashMap.empty()
	}
	return HashMap.make(
		T.make(
			state.versions.scheduledFetcher,
			Stream.make([
				Message.Home_FetchListTick({
					version: state.versions.scheduledFetcher,
				}),
			]).pipe(Stream.schedule(Schedule.spaced('3 seconds')), Stream.forever),
		),
	)
}

type FetchListSchedulerVersion = Brand.Branded<
	bigint,
	'FetchListSchedulerVersion'
>

const _FetchListSchedulerVersion = Brand.nominal<FetchListSchedulerVersion>()

const FetchListSchedulerVersion = {
	make: _FetchListSchedulerVersion,
	increment: (version: FetchListSchedulerVersion) =>
		_FetchListSchedulerVersion(version + 1n),
}

type FetchListVersion = Brand.Branded<bigint, 'FetchListVersion'>

const _FetchListVersion = Brand.nominal<FetchListVersion>()

const FetchListVersion = {
	make: _FetchListVersion,
	increment: (version: FetchListVersion) => _FetchListVersion(version + 1n),
}

export const init: StateManager.Transition<State, Message, UseCases> = T.make(
	{
		versions: {
			manualFetcher: FetchListVersion.make(0n),
			scheduledFetcher: FetchListSchedulerVersion.make(0n),
		},
		productListData: { _tag: 'Initial', activity: 'fetching' },
	},
	[],
)

export function makeModel(state: State): Model {
	if (state.productListData._tag === 'Initial') {
		return {
			canNavigateOut: true,
			productListStatus: { _tag: 'Initial', activity: 'fetching' },
			canFetch: { _tag: 'False' },
		} satisfies Model
	}

	if (state.productListData._tag !== 'Available') {
		return {
			canNavigateOut: true,
			productListStatus: state.productListData,
			canFetch:
				state.productListData.activity === 'fetching'
					? { _tag: 'False' }
					: { _tag: 'True', fetch: Message.Home_StartFetchList() },
		} satisfies Model
	}

	const productListData = state.productListData
	return {
		canFetch:
			productListData.activity !== 'deleting' &&
			productListData.activity !== 'fetching'
				? { _tag: 'True', fetch: Message.Home_StartFetchList() }
				: { _tag: 'False' },
		canNavigateOut: state.productListData.activity !== 'deleting',
		productListStatus: {
			_tag: state.productListData._tag,
			activity:
				state.productListData.activity === 'scheduledFetching'
					? 'fetching'
					: state.productListData.activity,
			canClearSelection:
				state.productListData.activity !== 'deleting' &&
				state.productListData.activity !== 'fetching'
					? { _tag: 'True', clearMessage: Message.Home_ClearSelected() }
					: { _tag: 'False' },
			canDeleteSelected:
				state.productListData.activity !== 'deleting' &&
				state.productListData.activity !== 'fetching'
					? {
							_tag: 'True',
							deleteMessage: Message.Home_StartDeleteAndRefresh(),
						}
					: { _tag: 'False' },
			products: Arr.map(
				state.productListData.products,
				(
					product,
				): Data.TaggedEnum.Value<
					Model['productListStatus'],
					'Available'
				>['products'][0] => {
					if (product._tag === 'Corrupt') {
						return {
							_tag: 'Corrupt',
							canToggle: { _tag: 'False' },
							maybeName: product.maybeName,
						}
					}
					if (product._tag === 'Invalid') {
						return {
							_tag: 'Invalid',
							canToggle:
								productListData.activity !== 'deleting' &&
								productListData.activity === 'fetching'
									? {
											_tag: 'True',
											message: Message.Home_ToggleItem({ id: product.id }),
										}
									: { _tag: 'False' },
							maybeName: product.maybeName,
							id: product.id,
							selected:
								Opt.isSome(productListData.maybeSelectedProducts) &&
								HashSet.has(
									productListData.maybeSelectedProducts.value,
									product.id,
								),
						}
					}
					return {
						_tag: 'Valid',
						canToggle:
							productListData.activity !== 'deleting' &&
							productListData.activity === 'fetching'
								? {
										_tag: 'True',
										message: Message.Home_ToggleItem({ id: product.id }),
									}
								: { _tag: 'False' },
						id: product.id,
						name: product.name,
						isSelected:
							Opt.isSome(productListData.maybeSelectedProducts) &&
							HashSet.has(
								productListData.maybeSelectedProducts.value,
								product.id,
							),
						status: product.status,
					}
				},
			),
			total: productListData.total,
		},
	} satisfies Model
}

const notifyWrongState = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logError(`Triggered ${message._tag} in wrong state`)
	return T.make(Message.NoOp())
})

const notifyStale = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logInfo(`Triggered stale ${message._tag}`)
	return T.make(Message.NoOp())
})

const deleteAndGetProducts = Effect.fn(function* (
	params: Parameters<UC.DeleteProductsByIds.DeleteProductsByIds['Service']>[0],
) {
	const deleteProducts = yield* UC.DeleteProductsByIds.DeleteProductsByIds
	{
		const result = yield* deleteProducts(params)
		if (result._tag === 'Failed') {
			return T.make(
				Message.Home_DeleteAndRefreshFailed({ response: result }),
				Message.ShowToast({ text: 'Delete failed' }),
			)
		}
	}
	const getProducts = yield* UC.GetProducts.GetProducts
	{
		const result = yield* getProducts
		return Match.valueTags(result, {
			Failed: response =>
				T.make(
					Message.Home_DeleteSucceededButRefreshFailed({ response }),
					Message.ShowToast({ text: 'Refresh failed' }),
				),
			Succeeded: response =>
				T.make(Message.Home_DeleteAndRefreshSucceeded({ response })),
		})
	}
})

const fetchList = Effect.fn(function* (version: bigint) {
	const getProducts = yield* UC.GetProducts.GetProducts
	const result = yield* getProducts
	return Match.valueTags(result, {
		Failed: response =>
			T.make(Message.Home_FetchListFailed({ version, response })),
		Succeeded: response =>
			T.make(Message.Home_FetchListSucceeded({ version, response })),
	})
})

const fetchListTick = Effect.fn(function* (version: bigint) {
	const getProducts = yield* UC.GetProducts.GetProducts
	const result = yield* getProducts
	return Match.valueTags(result, {
		Failed: response =>
			T.make(Message.Home_FetchListTickFailed({ version, response })),
		Succeeded: response =>
			T.make(Message.Home_FetchListTickSucceeded({ version, response })),
	})
})
