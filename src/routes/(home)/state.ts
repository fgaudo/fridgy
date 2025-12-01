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
	isDeleting: boolean
	isFetching: boolean
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

export const hasFreshProducts = (
	products: (State['productListStatus'] & { _tag: 'Available' })['products'],
): boolean =>
	products.some(
		product => product._tag === 'Valid' && product.status._tag === 'Fresh',
	)

export const isSchedulerEnabled = (state: State) =>
	!state.isDeleting && !state.isManualFetching

export const isLoadingData = (state: State) =>
	state.isFetching || state.isManualFetching
