import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'

import { InternalMessage } from '@/app/core/messages.ts'
import * as UC from '@/app/use-cases/index.ts'
import type * as StateManager from '@/shared/fsm.ts'
import * as ArrX from '@/shared/non-empty-array.ts'
import * as NonEmptyHashSet from '@/shared/non-empty-hash-set.ts'

import {
	FetchListSchedulerVersion,
	FetchListVersion,
	type State,
} from './model.ts'

export type UseCases =
	| UC.DeleteProductsByIds.DeleteProductsByIds
	| UC.GetProducts.GetProducts

type ProductDTO = Data.TaggedEnum.Value<
	State['productListData'],
	'Available'
>['products'][0]
const ProductDTO = Data.taggedEnum<ProductDTO>()

function updateFetchListSucceeded(
	state: State,
	maybeProducts: Data.TaggedEnum.Value<
		InternalMessage,
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
					_tag: 'Available' as const,
					activity: 'idle' as const,
					hasFreshProducts,
					maybeSelectedProducts: Opt.none(),
					products: mappedProducts,
					total: ArrX.length(maybeProducts.value),
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
				products: mappedProducts,
				total: ArrX.length(maybeProducts.value),
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
	Extract<InternalMessage, Record<'_tag', `Home_${string}`>>,
	ReturnType<StateManager.Update<State, InternalMessage, UseCases>>
>()({
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

	Home_DeleteAndRefreshSucceeded: message => state => {
		if (state.productListData.activity !== 'deleting') {
			return T.make(state, [notifyWrongState(message)])
		}
		return updateFetchListSucceeded(state, message.response.maybeProducts)
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

	Home_FetchListFailed: message => state => {
		if (state.versions.manualFetcher !== message.version) {
			return T.make(state, [notifyStale(message)])
		}
		if (state.productListData.activity !== 'fetching') {
			return T.make(state, [notifyWrongState(message)])
		}
		return updateFetchListFailed(state)
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
				productListData: {
					...state.productListData,
					activity: 'deleting' as const,
				},
				versions: {
					...state.versions,
					manualFetcher: FetchListVersion.increment(
						state.versions.manualFetcher,
					),
					scheduledFetcher: FetchListSchedulerVersion.increment(
						state.versions.scheduledFetcher,
					),
				},
			},
			[
				deleteAndGetProducts({
					ids: state.productListData.maybeSelectedProducts.value,
				}),
			],
		)
	},

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
				productListData: {
					...state.productListData,
					activity: 'fetching' as const,
				},
				versions: {
					...state.versions,
					manualFetcher: nextFetchVersion,
					scheduledFetcher: FetchListSchedulerVersion.increment(
						state.versions.scheduledFetcher,
					),
				},
			},
			T.make(fetchList(nextFetchVersion)),
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
								onNone: () => HashSet.make(message.id),
								onSome: map =>
									HashSet.has(map, message.id)
										? HashSet.remove(map, message.id)
										: HashSet.add(map, message.id),
							}),
							NonEmptyHashSet.make,
						),
				},
			},
			[],
		)
	},
})

export const subscriptions: StateManager.Emitter<
	State,
	InternalMessage,
	UseCases
> = state => {
	if (!isSchedulerRunning(state)) {
		return HashMap.empty()
	}
	return HashMap.make(
		T.make(
			state.versions.scheduledFetcher,
			Stream.make([
				InternalMessage.Home_FetchListTick({
					version: state.versions.scheduledFetcher,
				}),
			]).pipe(Stream.schedule(Schedule.spaced('3 seconds')), Stream.forever),
		),
	)
}

export const init: StateManager.Step<State, InternalMessage, UseCases> = T.make(
	{
		productListData: { _tag: 'Initial', activity: 'idle' },
		versions: {
			manualFetcher: FetchListVersion.make(0n),
			scheduledFetcher: FetchListSchedulerVersion.make(0n),
		},
	},
	[Effect.succeed(T.make(InternalMessage.Home_StartFetchList()))],
)

const notifyWrongState = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logError(`Triggered ${message._tag} in wrong state`)
	return T.make(InternalMessage.NoOp())
})

const notifyStale = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logInfo(`Triggered stale ${message._tag}`)
	return T.make(InternalMessage.NoOp())
})

const deleteAndGetProducts = Effect.fn(function* (
	params: Parameters<UC.DeleteProductsByIds.DeleteProductsByIds['Service']>[0],
) {
	const deleteProducts = yield* UC.DeleteProductsByIds.DeleteProductsByIds
	{
		const result = yield* deleteProducts(params)
		if (result._tag === 'Failed') {
			return T.make(
				InternalMessage.Home_DeleteAndRefreshFailed({ response: result }),
				InternalMessage.ShowToast({ text: 'Delete failed' }),
			)
		}
	}
	const getProducts = yield* UC.GetProducts.GetProducts
	{
		const result = yield* getProducts
		return Match.valueTags(result, {
			Failed: response =>
				T.make(
					InternalMessage.Home_DeleteSucceededButRefreshFailed({ response }),
					InternalMessage.ShowToast({ text: 'Refresh failed' }),
				),
			Succeeded: response =>
				T.make(InternalMessage.Home_DeleteAndRefreshSucceeded({ response })),
		})
	}
})

const fetchList = Effect.fn(function* (version: bigint) {
	const getProducts = yield* UC.GetProducts.GetProducts
	const result = yield* getProducts
	return Match.valueTags(result, {
		Failed: response =>
			T.make(InternalMessage.Home_FetchListFailed({ response, version })),
		Succeeded: response =>
			T.make(InternalMessage.Home_FetchListSucceeded({ response, version })),
	})
})

const fetchListTick = Effect.fn(function* (version: bigint) {
	const getProducts = yield* UC.GetProducts.GetProducts
	const result = yield* getProducts
	return Match.valueTags(result, {
		Failed: response =>
			T.make(InternalMessage.Home_FetchListTickFailed({ response, version })),
		Succeeded: response =>
			T.make(
				InternalMessage.Home_FetchListTickSucceeded({ response, version }),
			),
	})
})
