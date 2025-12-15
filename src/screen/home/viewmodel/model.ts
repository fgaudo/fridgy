import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'

import * as Integer from '@/core/integer/integer.ts'
import * as PositiveInteger from '@/core/integer/positive.ts'
import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as SM from '@/core/state-manager.ts'
import * as UnitInterval from '@/core/unit-interval.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import { Message } from './message.ts'
import * as State from './state.ts'

export type Model = Readonly<{
	isFetching: boolean
	canFetch: Data.TaggedEnum<{
		True: { fetch: Effect.Effect<void> }
		False: object
	}>
	canNavigateToAddProduct: boolean
	productListStatus: Data.TaggedEnum<{
		Initial: object
		Error: object
		Empty: object
		Available: Readonly<{
			isDeleting: boolean
			canDelete: Data.TaggedEnum<{
				True: { deleteSelected: Effect.Effect<void> }
				False: object
			}>
			canClearSelection: Data.TaggedEnum<{
				True: { clear: Effect.Effect<void> }
				False: object
			}>
			isSelectingProducts: Data.TaggedEnum<{
				True: { number: PositiveInteger.PositiveInteger }
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
						canToggle:
							| { _tag: 'True'; toggle: Effect.Effect<void> }
							| { _tag: 'False' }
						selected: boolean
						id: string
						maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
					}>
					Valid: Readonly<{
						canToggle:
							| { _tag: 'True'; toggle: Effect.Effect<void> }
							| { _tag: 'False' }
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

export const make =
	(dispatch: SM.StateManager<State.State, Message, UC.All>['dispatch']) =>
	(state: State.State): Model => {
		const isFetching = state.isFetching || state.isManualFetching

		const canFetch =
			!state.isManualFetching &&
			state.productListStatus._tag === 'Available' &&
			!state.productListStatus.isDeleting
				? ({
						_tag: 'True',
						fetch: dispatch(Message.StartFetchList()),
					} as const)
				: ({ _tag: 'False' } as const)

		if (state.productListStatus._tag !== 'Available') {
			return {
				...state,
				canNavigateToAddProduct: true,
				isFetching,
				canFetch,
				productListStatus: state.productListStatus,
			}
		}

		const status = state.productListStatus
		const maybeSelected = status.maybeSelectedProducts

		const canClearSelection = State.isSelectionClearable({
			...state,
			productListStatus: status,
		})
			? ({
					_tag: 'True',
					clear: dispatch(Message.ClearSelected()),
				} as const)
			: ({ _tag: 'False' } as const)

		const canDelete = State.isDeletingAllowed({
			...state,
			productListStatus: status,
		})
			? ({
					_tag: 'True',
					deleteSelected: dispatch(Message.StartDeleteAndRefresh()),
				} as const)
			: ({ _tag: 'False' } as const)

		const isSelectingProducts = Option.isSome(maybeSelected)
			? ({
					_tag: 'True',
					number: NonEmptyHashSet.size(maybeSelected.value),
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
									toggle: dispatch(Message.ToggleItem({ id: product.id })),
								} as const),
						selected: pipe(
							maybeSelected,
							Option.map(HashSet.has(product.id)),
							Option.getOrElse(() => false),
						),
					},
		)

		const canNavigateToAddProduct =
			isSelectingProducts._tag === 'False' && !status.isDeleting

		return {
			...state,
			canNavigateToAddProduct,
			isFetching,
			canFetch,
			productListStatus: {
				...status,
				canClearSelection,
				canDelete,
				isSelectingProducts,
				products,
			},
		}
	}

export const init = (state: State.State): Model => {
	const isFetching = state.isFetching || state.isManualFetching

	const canFetch = { _tag: 'False' } as const

	if (state.productListStatus._tag !== 'Available') {
		return {
			...state,
			canNavigateToAddProduct: true,
			isFetching,
			canFetch,
			productListStatus: state.productListStatus,
		}
	}

	const status = state.productListStatus
	const maybeSelected = status.maybeSelectedProducts
	const canClearSelection = { _tag: 'False' } as const
	const canDelete = { _tag: 'False' } as const
	const isSelectingProducts = Option.isSome(maybeSelected)
		? ({
				_tag: 'True',
				number: NonEmptyHashSet.size(maybeSelected.value),
			} as const)
		: ({ _tag: 'False' } as const)

	const products = Arr.map(status.products, product =>
		product._tag === 'Corrupt'
			? ({ ...product, canToggle: { _tag: 'False' } } as const)
			: {
					...product,
					canToggle: { _tag: 'False' } as const,
					selected: pipe(
						maybeSelected,
						Option.map(HashSet.has(product.id)),
						Option.getOrElse(() => false),
					),
				},
	)

	const canNavigateToAddProduct =
		isSelectingProducts._tag === 'False' && !status.isDeleting

	return {
		...state,
		canNavigateToAddProduct,
		isFetching,
		canFetch,
		productListStatus: {
			...status,
			canClearSelection,
			canDelete,
			isSelectingProducts,
			products,
		},
	}
}

type isNotInAvailable = Model & {
	productListStatus: Exclude<Model['productListStatus'], { _tag: 'Available' }>
}

type IsInAvailable = Model & { productListStatus: { _tag: 'Available' } }

export const isNotInAvailable = (model: Model): model is isNotInAvailable =>
	model.productListStatus._tag !== 'Available'

type IsInEmpty = Model & { productListStatus: { _tag: 'Empty' } }
export const isInEmpty = (model: Model): model is IsInEmpty =>
	model.productListStatus._tag === 'Empty'

type IsInError = Model & { productListStatus: { _tag: 'Error' } }
export const isInError = (model: Model): model is IsInError =>
	model.productListStatus._tag === 'Error'

type IsInInitial = Model & { productListStatus: { _tag: 'Initial' } }
export const isInInitial = (model: Model): model is IsInInitial =>
	model.productListStatus._tag === 'Initial'
