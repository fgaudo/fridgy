import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'

import * as Integer from '@/core/integer/integer.ts'
import * as PositiveInteger from '@/core/integer/positive.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as UnitInterval from '@/core/unit-interval.ts'

import { Message } from './message.ts'
import * as State from './state.ts'

export type Model = Readonly<{
	isFetching: boolean
	canNavigateOut: boolean
	canFetch: Data.TaggedEnum<{
		True: { fetch: Message }
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
					deleteSelected: Message
				}
				False: object
			}>
			canClearSelection: Data.TaggedEnum<{
				True: {
					clear: Message
				}
				False: object
			}>
			total: PositiveInteger.PositiveInteger
			products: Arr.NonEmptyReadonlyArray<
				Data.TaggedEnum<{
					Corrupt: Readonly<{
						canToggle: { _tag: 'False' }
						maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
					}>
					Invalid: Readonly<{
						canToggle: { _tag: 'True'; toggle: Message } | { _tag: 'False' }
						selected: boolean
						id: string
						maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
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

export const Model = {
	ProductListStatus: Data.taggedEnum<Model['productListStatus']>(),
}

export const make = (state: State.State): Model => {
	const isFetching = state.isFetching || state.isManualFetching

	const canFetch =
		!state.isManualFetching &&
		state.productListStatus._tag === 'Available' &&
		!state.productListStatus.isDeleting
			? ({
					_tag: 'True',
					fetch: Message.StartFetchList(),
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

	const canDelete = State.isDeletingAllowed({
		...state,
		productListStatus: status,
	})
		? ({
				_tag: 'True',
				deleteSelected: Message.StartDeleteAndRefresh(),
			} as const)
		: ({ _tag: 'False' } as const)

	const canClearSelection = State.isSelectionClearable({
		...state,
		productListStatus: status,
	})
		? ({
				_tag: 'True',
				clear: Message.ClearSelected(),
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
								toggle: Message.ToggleItem({ id: product.id }),
							} as const),
					selected: pipe(
						maybeSelected,
						Option.map(HashSet.has(product.id)),
						Option.getOrElse(() => false),
					),
				},
	)

	return {
		...state,
		isFetching,
		canFetch,
		canNavigateOut:
			!state.productListStatus.isDeleting &&
			Option.isNone(state.productListStatus.maybeSelectedProducts),
		productListStatus: {
			...status,
			canClearSelection,
			canDelete,
			products,
		},
	}
}
