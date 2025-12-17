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
	productListStatus: Data.TaggedEnum<{
		Initial: object
		Error: object
		Empty: object
		Available: Readonly<{
			isDeleting: boolean
			hasSelectedProducts: Data.TaggedEnum<{
				True: {
					number: PositiveInteger.PositiveInteger
					canDelete: Data.TaggedEnum<{
						True: { deleteSelected: Effect.Effect<void> }
						False: object
					}>
					canClearSelection: Data.TaggedEnum<{
						True: { clear: Effect.Effect<void> }
						False: object
					}>
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

		const hasSelectedProducts = Option.isSome(maybeSelected)
			? ({
					_tag: 'True',
					number: NonEmptyHashSet.size(maybeSelected.value),
					canDelete,
					canClearSelection,
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

		return {
			...state,
			isFetching,
			canFetch,
			productListStatus: {
				...status,
				hasSelectedProducts,
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
			isFetching,
			canFetch,
			productListStatus: state.productListStatus,
		}
	}

	const status = state.productListStatus
	const maybeSelected = status.maybeSelectedProducts
	const canClearSelection = { _tag: 'False' } as const
	const canDelete = { _tag: 'False' } as const
	const hasSelectedProducts = Option.isSome(maybeSelected)
		? ({
				_tag: 'True',
				number: NonEmptyHashSet.size(maybeSelected.value),
				canDelete,
				canClearSelection,
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

	return {
		...state,
		isFetching,
		canFetch,
		productListStatus: {
			...status,
			hasSelectedProducts,
			products,
		},
	}
}

type IsInAvailable = Model & { productListStatus: { _tag: 'Available' } }
export const isInAvailable = (model: Model): model is IsInAvailable =>
	model.productListStatus._tag === 'Available'

type IsSelectingProducts = Model &
	IsInAvailable & {
		productListStatus: { hasSelectedProducts: { _tag: 'True' } }
	}

export const hasSelectedProducts = (
	model: Model,
): model is IsInAvailable & IsSelectingProducts =>
	isInAvailable(model) &&
	model.productListStatus.hasSelectedProducts._tag === 'True'

export const canClearSelection = (
	model: Model,
): model is IsInAvailable &
	IsSelectingProducts & {
		productListStatus: {
			hasSelectedProducts: { canClearSelection: { _tag: 'True' } }
		}
	} =>
	isInAvailable(model) &&
	hasSelectedProducts(model) &&
	model.productListStatus.hasSelectedProducts.canClearSelection._tag === 'True'

export const canDeleteSelected = (
	model: Model,
): model is IsInAvailable &
	IsSelectingProducts & {
		productListStatus: { hasSelectedProducts: { canDelete: { _tag: 'True' } } }
	} =>
	isInAvailable(model) &&
	hasSelectedProducts(model) &&
	model.productListStatus.hasSelectedProducts.canDelete._tag === 'True'

export const canNavigateToAddProduct = (model: Model) =>
	model.productListStatus._tag !== 'Available' ||
	(model.productListStatus._tag === 'Available' &&
		!model.productListStatus.isDeleting &&
		model.productListStatus.hasSelectedProducts._tag === 'False')
