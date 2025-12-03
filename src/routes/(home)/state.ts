import * as Arr from 'effect/Array'
import * as Brand from 'effect/Brand'
import * as Data from 'effect/Data'
import * as Option from 'effect/Option'

import * as Integer from '@/core/integer/integer.ts'
import * as PositiveInteger from '@/core/integer/positive.ts'
import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as UnitInterval from '@/core/unit-interval.ts'

const fetchSchedulerSymbol: unique symbol = Symbol()
export type FetchListSchedulerVersion = Brand.Branded<
	number,
	typeof fetchSchedulerSymbol
>
const _FetchListSchedulerVersion = Brand.nominal<FetchListSchedulerVersion>()
export const FetchListSchedulerVersion = {
	make: _FetchListSchedulerVersion,
	increment: (version: FetchListSchedulerVersion) =>
		_FetchListSchedulerVersion(version + 1),
}

const fetchSymbol: unique symbol = Symbol()
export type FetchListVersion = Brand.Branded<number, typeof fetchSymbol>
export const _FetchListVersion = Brand.nominal<FetchListVersion>()
export const FetchListVersion = {
	make: _FetchListVersion,
	increment: (version: FetchListVersion) => _FetchListVersion(version + 1),
}

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

export const init: State = {
	fetchListVersion: FetchListVersion.make(0),
	fetchListSchedulerVersion: FetchListSchedulerVersion.make(0),
	isFetching: false,
	isManualFetching: false,
	productListStatus: { _tag: 'Initial' },
}

type IsInAvailable = State & { productListStatus: { _tag: 'Available' } }
type isNotInAvailable = State & {
	productListStatus: Exclude<State['productListStatus'], { _tag: 'Available' }>
}

export const isInAvailable = (state: State): state is State & IsInAvailable =>
	state.productListStatus._tag === 'Available'

export const isEmpty = (
	state: State,
): state is State & { productListStatus: { _tag: 'Empty' } } =>
	state.productListStatus._tag === 'Empty'

export const isError = (
	state: State,
): state is State & { productListStatus: { _tag: 'Error' } } =>
	state.productListStatus._tag === 'Error'

export const isInitial = (
	state: State,
): state is State & { productListStatus: { _tag: 'Initial' } } =>
	state.productListStatus._tag === 'Initial'

export const hasFreshProducts = (state: State): state is IsInAvailable =>
	isInAvailable(state) &&
	state.productListStatus.products.some(
		product => product._tag === 'Valid' && product.status._tag === 'Fresh',
	)

type HasSelectedProducts = State &
	IsInAvailable & {
		productListStatus: {
			maybeSelectedProducts: Option.Some<
				Option.Option.Value<
					Data.TaggedEnum.Value<
						State['productListStatus'],
						'Available'
					>['maybeSelectedProducts']
				>
			>
		}
	}

export const hasSelectedProducts = (
	state: State,
): state is IsInAvailable & HasSelectedProducts =>
	isInAvailable(state) &&
	Option.isSome(state.productListStatus.maybeSelectedProducts)

type IsDeleting = State &
	IsInAvailable & {
		productListStatus: { isDeleting: true }
	}

type IsNotDeleting = State &
	IsInAvailable & {
		productListStatus: { isDeleting: false }
	}

export const isDeleting = (state: State): state is IsInAvailable & IsDeleting =>
	isInAvailable(state) && state.productListStatus.isDeleting

type IsFetching = State & {
	isFetching: true
}

export const isFetching = (state: State): state is IsFetching =>
	state.isFetching

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

export const isManualFetching = (
	state: State,
): state is IsFetching & IsManualFetching =>
	isFetching(state) && state.isManualFetching

export const productsAreToggleable = (
	state: State,
): state is IsInAvailable & IsNotManualFetching & IsNotDeleting =>
	isInAvailable(state) && !isManualFetching(state) && !isDeleting(state)

export const isDeletingAllowed = (
	state: State,
): state is IsInAvailable &
	IsNotManualFetching &
	IsNotDeleting &
	HasSelectedProducts =>
	isInAvailable(state) &&
	!isManualFetching(state) &&
	!isDeleting(state) &&
	hasSelectedProducts(state)

export const isFetchingAllowed = (
	state: State,
): state is IsNotDeleting | isNotInAvailable =>
	!isDeleting(state) || !isInAvailable(state)

export const isSelectionClearable = (
	state: State,
): state is IsInAvailable & IsNotDeleting & HasSelectedProducts =>
	isInAvailable(state) && !isDeleting(state) && hasSelectedProducts(state)
