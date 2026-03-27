import * as Arr from 'effect/Array'
import * as Brand from 'effect/Brand'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Newtype from 'effect/Newtype'
import * as Opt from 'effect/Option'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'

import { UseCase as UC } from '@/business/index.ts'
import * as Integer from '@/core/integer/integer.ts'
import * as PositiveInteger from '@/core/integer/positive.ts'
import * as ArrX from '@/core/non-empty-array.ts'
import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as StateManager from '@/core/state-manager.ts'
import * as UnitInterval from '@/core/unit-interval.ts'
import { HOME_SCHEDULER_FREQUENCY } from '@/screen/home/viewmodel/constants'

type UseCases =
	| UC.DeleteProductsByIds.DeleteProductsByIds
	| UC.GetProducts.GetProducts

export type Model = Readonly<{
	canNavigateOut: boolean
	canFetch: Data.TaggedEnum<{
		True: { fetch: Message }
		False: object
	}>
	productListStatus: Data.TaggedEnum<{
		Initial: { activity: 'fetching' | 'idle' }
		Error: { activity: 'fetching' | 'idle' }
		Empty: { activity: 'fetching' | 'idle' }
		Available: Readonly<{
			activity: 'fetching' | 'idle' | 'deleting'
			canDeleteSelected: Data.TaggedEnum<{
				True: {
					deleteMessage: Message
				}
				False: object
			}>
			canClearSelection: Data.TaggedEnum<{
				True: {
					clearMessage: Message
				}
				False: object
			}>
			total: PositiveInteger.PositiveInteger
			products: Arr.NonEmptyReadonlyArray<
				Data.TaggedEnum<{
					Corrupt: Readonly<{
						canToggle: Data.TaggedEnum<{ False: object }>
						maybeName: Opt.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
					}>
					Invalid: Readonly<{
						canToggle: Data.TaggedEnum<{
							True: { message: Message }
							False: object
						}>
						selected: boolean
						id: string
						maybeName: Opt.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
					}>
					Valid: Readonly<{
						canToggle: Data.TaggedEnum<{
							True: { message: Message }
							False: object
						}>
						id: string
						isSelected: boolean
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

export type Message = Newtype.Newtype<
	'HomeMessage',
	Data.TaggedEnum<{
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
>
const messageIso = Newtype.makeIso<Message>()

type MessageRaw = Newtype.Newtype.Carrier<Message>
const MessageRaw = Data.taggedEnum<MessageRaw>()

export type State = Newtype.Newtype<
	'HomeState',
	Readonly<{
		versions: {
			scheduledFetcher: FetchListSchedulerVersion
			manualFetcher: FetchListVersion
		}
		productListData: Data.TaggedEnum<{
			Initial: { activity: 'fetching' | 'idle' }
			Error: { activity: 'fetching' | 'idle' }
			Empty: { activity: 'fetching' | 'idle' }
			Available: Readonly<{
				activity: 'scheduledFetching' | 'idle' | 'deleting' | 'fetching'
				maybeSelectedProducts: Opt.Option<
					NonEmptyHashSet.NonEmptyHashSet<string>
				>
				total: PositiveInteger.PositiveInteger
				hasFreshProducts: boolean
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
>
const stateIso = Newtype.makeIso<State>()
type StateRaw = Newtype.Newtype.Carrier<State>

type ProductDTO = Data.TaggedEnum.Value<
	StateRaw['productListData'],
	'Available'
>['products'][0]

const ProductDTO = Data.taggedEnum<ProductDTO>()

function updateFetchListSucceeded(
	state: StateRaw,
	maybeProducts: Data.TaggedEnum.Value<
		MessageRaw,
		'FetchListSucceeded'
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
			return ProductDTO.Corrupt({ ...product, id: Symbol() })
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
			} satisfies StateRaw,
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

function updateFetchListFailed(state: StateRaw) {
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

function hasSelectedProducts(
	state: StateRaw & { productListData: { _tag: 'Available' } },
) {
	return Opt.isSome(state.productListData.maybeSelectedProducts)
}

function productsAreToggleable(state: StateRaw) {
	return (
		state.productListData.activity === 'idle' ||
		state.productListData.activity === 'scheduledFetching'
	)
}

function isSchedulerRunning(
	state: StateRaw,
): state is StateRaw & { productListData: { _tag: 'Available' } } {
	const productListData = state.productListData
	return (
		productListData._tag === 'Available' &&
		(productListData.activity === 'scheduledFetching' ||
			productListData.activity === 'idle') &&
		productListData.hasFreshProducts
	)
}

function isDeletingAllowed(state: StateRaw): state is typeof state & {
	productListData: Data.TaggedEnum.Value<
		(typeof state)['productListData'],
		'Available'
	> & {
		activity: Exclude<
			(typeof state)['productListData']['activity'],
			'fetching' | 'deleting'
		>
		maybeSelectedProducts: Opt.Some<
			Opt.Option.Value<
				Data.TaggedEnum.Value<
					(typeof state)['productListData'],
					'Available'
				>['maybeSelectedProducts']
			>
		>
	}
} {
	return (
		state.productListData._tag === 'Available' &&
		state.productListData.activity !== 'fetching' &&
		state.productListData.activity !== 'deleting' &&
		Opt.isSome(state.productListData.maybeSelectedProducts)
	)
}

const _update = Match.typeTags<
	MessageRaw,
	ReturnType<StateManager.Update<StateRaw, MessageRaw, UseCases>>
>()({
	Crash: error => state =>
		T.make(state, [Effect.logFatal(error).pipe(Effect.as(MessageRaw.NoOp()))]),

	NoOp: () => state => T.make(state, []),

	StartFetchList: message => state => {
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

			[fetchList(nextFetchVersion)],
		)
	},

	FetchListSucceeded: message => state => {
		if (state.versions.manualFetcher !== message.version) {
			return T.make(state, [notifyStale(message)])
		}

		if (state.productListData.activity !== 'fetching') {
			return T.make(state, [notifyWrongState(message)])
		}

		return updateFetchListSucceeded(state, message.response.maybeProducts)
	},

	FetchListFailed: message => state => {
		if (state.versions.manualFetcher !== message.version) {
			return T.make(state, [notifyStale(message)])
		}

		if (state.productListData.activity !== 'fetching') {
			return T.make(state, [notifyWrongState(message)])
		}

		return updateFetchListFailed(state)
	},

	FetchListTick: message => state => {
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

	FetchListTickSucceeded: message => state => {
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

	FetchListTickFailed: message => state => {
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

	StartDeleteAndRefresh: message => state => {
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

	DeleteAndRefreshSucceeded: message => state => {
		if (state.productListData.activity !== 'deleting') {
			return T.make(state, [notifyWrongState(message)])
		}

		return updateFetchListSucceeded(state, message.response.maybeProducts)
	},

	DeleteAndRefreshFailed: message => state => {
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

	DeleteSucceededButRefreshFailed: message => state => {
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

	ToggleItem: message => state => {
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
								onSome: HashSet.has(message.id)
									? HashSet.remove(message.id)
									: HashSet.add(message.id),
								onNone: () => HashSet.make(message.id),
							}),
							NonEmptyHashSet.make,
						),
				},
			},
			[],
		)
	},

	ClearSelected: message => state => {
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

export const fatalMessage = (errors: unknown) =>
	messageIso.set(MessageRaw.Crash({ error: errors }))

export const update: StateManager.Update<State, Message, UseCases> =
	message => state => {
		const _message = messageIso.get(message)
		const _state = stateIso.get(state)

		const [newState, commands] = _update(_message)(_state)

		return [
			stateIso.set(newState),
			Arr.map(commands, Effect.map(messageIso.set)),
		] as const
	}

const _subscriptions: StateManager.Subscriptions<
	StateRaw,
	MessageRaw,
	UseCases
> = state => {
	if (!isSchedulerRunning(state)) {
		return HashMap.empty()
	}

	return HashMap.make([
		state.versions.scheduledFetcher,
		Stream.make(
			MessageRaw.FetchListTick({ version: state.versions.scheduledFetcher }),
		).pipe(
			Stream.schedule(Schedule.spaced(HOME_SCHEDULER_FREQUENCY)),
			Stream.forever,
		),
	])
}

export const subscriptions: StateManager.Subscriptions<
	State,
	Message,
	UseCases
> = _state => {
	const state = stateIso.get(_state)

	const subs = _subscriptions(state)

	return HashMap.map(subs, Stream.map(messageIso.set))
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
	stateIso.set({
		versions: {
			manualFetcher: FetchListVersion.make(0n),
			scheduledFetcher: FetchListSchedulerVersion.make(0n),
		},
		productListData: { _tag: 'Initial', activity: 'idle' },
	}),
	[],
)

function makeModel(s: State): Model {
	const state = stateIso.get(s)
	const isFetching = state.isFetchingAutomatically || state.isFetchingManually

	const canFetch =
		!state.isFetchingManually &&
		state.productListData._tag === 'Available' &&
		!state.productListData.isDeleting
			? ({
					_tag: 'True',
					fetch: MessageRaw.StartFetchList(),
				} as const)
			: ({ _tag: 'False' } as const)

	if (state.productListData._tag !== 'Available') {
		return {
			...state,
			canNavigateOut: true,
			isFetching,
			canFetch,
			productListStatus: state.productListData,
		}
	}

	const status = state.productListData
	const maybeSelected = status.maybeSelectedProducts

	const canDelete = isDeletingAllowed({
		...state,
		productListData: status,
	})
		? ({
				_tag: 'True',
				deleteSelected: MessageRaw.StartDeleteAndRefresh(),
			} as const)
		: ({ _tag: 'False' } as const)

	const canClearSelection = isSelectionClearable({
		...state,
		productListData: status,
	})
		? ({
				_tag: 'True',
				clear: MessageRaw.ClearSelected(),
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
								toggle: MessageRaw.ToggleItem({ id: product.id }),
							} as const),
					selected: maybeSelected.pipe(
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
			!state.productListData.isDeleting &&
			Opt.isNone(state.productListData.maybeSelectedProducts),
		productListStatus: {
			...status,
			canClearSelection,
			canDeleteSelected: canDelete,
			products,
		},
	}
}

const notifyWrongState = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logError(`Triggered ${message._tag} in wrong state`)
	return MessageRaw.NoOp()
})

const notifyStale = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logInfo(`Triggered stale ${message._tag}`)
	return MessageRaw.NoOp()
})

const deleteAndGetProducts = Effect.fn(function* (
	params: Parameters<UC.DeleteProductsByIds.DeleteProductsByIds['Service']>[0],
) {
	const deleteProducts = yield* UC.DeleteProductsByIds.DeleteProductsByIds

	{
		const result = yield* deleteProducts(params)

		if (result._tag === 'Failed') {
			return MessageRaw.DeleteAndRefreshFailed({ response: result })
		}
	}

	const { run } = yield* UC.GetProducts.GetProducts

	{
		const result = yield* run

		return Match.valueTags(result, {
			Failed: response =>
				MessageRaw.DeleteSucceededButRefreshFailed({ response }),
			Succeeded: response => MessageRaw.DeleteAndRefreshSucceeded({ response }),
		})
	}
})

const fetchList = Effect.fn(function* (version: FetchListVersion) {
	const { run } = yield* UC.GetProducts.GetProducts

	const result = yield* run

	return Match.valueTags(result, {
		Failed: response => MessageRaw.FetchListFailed({ version, response }),
		Succeeded: response => MessageRaw.FetchListSucceeded({ version, response }),
	})
})

const fetchListTick = Effect.fn(function* (version: FetchListSchedulerVersion) {
	const { run } = yield* UC.GetProducts.GetProducts

	const result = yield* run

	return Match.valueTags(result, {
		Failed: response => MessageRaw.FetchListTickFailed({ version, response }),
		Succeeded: response =>
			MessageRaw.FetchListTickSucceeded({ version, response }),
	})
})

/** @internal */
export const _testing = {
	messageIso,
	stateIso,
}
