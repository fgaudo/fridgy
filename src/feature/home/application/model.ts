import * as Arr from 'effect/Array'
import * as Brand from 'effect/Brand'
import type * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import type * as PositiveInteger from '@/libs/integer/positive-integer.ts'
import type * as NonEmptyHashSet from '@/libs/non-empty-hash-set.ts'
import type * as UnitInterval from '@/libs/unit-interval.ts'
import { InternalMessage } from './messages.ts'

export type Model = Readonly<{
  isMenuOpen: boolean
  isInteracting: boolean
  isViewportAtTop: boolean
  canNavigateOut: boolean
  addProduct: Data.TaggedEnum<{
    Open: {
      name: string
      expirationDate: string | number
      isSubmittable: Data.TaggedEnum<{
        True: { submit: InternalMessage }
        False: object
      }>
    }
    Closed: object
  }>
  productListStatus: Data.TaggedEnum<{
    Initial: { activity: 'fetching' | 'idle' | 'adding' }
    Error: { activity: 'fetching' | 'idle' | 'adding' }
    Empty: { activity: 'fetching' | 'idle' | 'adding' }
    Available: Readonly<{
      activity: 'fetching' | 'idle' | 'deleting' | 'adding'
      canDeleteSelected: Data.TaggedEnum<{
        True: Readonly<{
          deleteMessage: InternalMessage
        }>
        False: object
      }>
      canClearSelection: Data.TaggedEnum<{
        True: Readonly<{
          clearMessage: InternalMessage
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
              True: Readonly<{ message: InternalMessage }>
              False: object
            }>
            isSelected: boolean
            id: string
            maybeName: Opt.Option<string>
          }>
          Valid: Readonly<{
            canToggle: Data.TaggedEnum<{
              True: Readonly<{ message: InternalMessage }>
              False: object
            }>
            id: string
            isSelected: boolean
            name: string
            status: Data.TaggedEnum<{
              Everlasting: object
              Stale: Readonly<{ expirationDate: DateTime.Utc }>
              Fresh: Readonly<{
                expirationDate: DateTime.Utc
                timeLeft: Duration.Duration
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
  isMenuOpen: boolean
  isViewportAtTop: boolean
  isInteracting: boolean
  versions: {
    manualFetcher: FetchListVersion
  }
  addProduct: Data.TaggedEnum<{
    Open: {
      isSubmittable: boolean
      maybeName: Opt.Option<string>
      maybeExpirationDate: Opt.Option<DateTime.Utc>
    }
    Closed: object
  }>
  productListData: Data.TaggedEnum<{
    Initial: { activity: 'fetching' | 'idle' | 'adding' }
    Error: { activity: 'fetching' | 'idle' | 'adding' }
    Empty: { activity: 'fetching' | 'idle' | 'adding' }
    Available: Readonly<{
      activity: 'idle' | 'deleting' | 'fetching' | 'adding'
      maybeSelectedProducts: Opt.Option<NonEmptyHashSet.NonEmptyHashSet<string>>
      total: PositiveInteger.PositiveInteger
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
              Stale: Readonly<{ expirationDate: DateTime.Utc }>
              Fresh: Readonly<{
                expirationDate: DateTime.Utc
                timeLeft: Duration.Duration
                freshnessRatio: UnitInterval.UnitInterval
              }>
            }>
          }>
        }>
      >
    }>
  }>
}>

type FetchListVersion = Brand.Branded<bigint, 'FetchListVersion'>
const _FetchListVersion = Brand.nominal<FetchListVersion>()
export const FetchListVersion = {
  increment: (version: FetchListVersion) => _FetchListVersion(version + 1n),
  make: _FetchListVersion,
}

export function makeModel(state: State): Model {
  if (state.productListData._tag === 'Initial') {
    return {
      addProduct: { _tag: 'Closed' },
      isViewportAtTop: state.isViewportAtTop,
      isMenuOpen: state.isMenuOpen,
      isInteracting: state.isInteracting,
      canNavigateOut: true,
      productListStatus: {
        _tag: 'Initial',
        activity: state.productListData.activity,
      },
    } satisfies Model
  }
  const addProduct: Model['addProduct'] = state.addProduct._tag === 'Closed' ? { ...state.addProduct } : {
    ...state.addProduct,
    isSubmittable: state.addProduct.isSubmittable
      ? { _tag: 'True', submit: InternalMessage.AddProductStarted() } as const
      : { _tag: 'False' } as const,
    name: Opt.getOrElse(state.addProduct.maybeName, () => ''),
    expirationDate: Opt.map(
      state.addProduct.maybeExpirationDate,
      () => '',
    ).pipe(Opt.getOrElse(
      () => '',
    )),
  }

  if (state.productListData._tag !== 'Available') {
    return {
      addProduct,
      isViewportAtTop: state.isViewportAtTop,
      isMenuOpen: state.isMenuOpen,
      isInteracting: state.isInteracting,
      canNavigateOut: true,
      productListStatus: state.productListData,
    } satisfies Model
  }
  const productListData = state.productListData
  return {
    addProduct,
    isViewportAtTop: state.isViewportAtTop,
    isMenuOpen: state.isMenuOpen,
    isInteracting: state.isInteracting,
    canNavigateOut: state.productListData.activity !== 'deleting',
    productListStatus: {
      _tag: state.productListData._tag,
      activity: state.productListData.activity,
      canClearSelection: state.productListData.activity !== 'deleting'
          && state.productListData.activity !== 'fetching'
        ? { _tag: 'True', clearMessage: InternalMessage.ClearSelected() }
        : { _tag: 'False' },
      canDeleteSelected: state.productListData.activity !== 'deleting'
          && state.productListData.activity !== 'fetching'
        ? {
          _tag: 'True',
          deleteMessage: InternalMessage.DeleteStarted(),
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
              canToggle: productListData.activity !== 'deleting'
                  && productListData.activity === 'fetching'
                ? {
                  _tag: 'True',
                  message: InternalMessage.ItemToggled({
                    id: product.id,
                  }),
                }
                : { _tag: 'False' },
              id: product.id,
              isSelected: Opt.isSome(productListData.maybeSelectedProducts)
                && HashSet.has(
                  productListData.maybeSelectedProducts.value,
                  product.id,
                ),
              maybeName: product.maybeName,
            }
          }
          return {
            _tag: 'Valid',
            canToggle: productListData.activity !== 'deleting'
                && productListData.activity === 'fetching'
              ? {
                _tag: 'True',
                message: InternalMessage.ItemToggled({
                  id: product.id,
                }),
              }
              : { _tag: 'False' },
            id: product.id,
            isSelected: Opt.isSome(productListData.maybeSelectedProducts)
              && HashSet.has(
                productListData.maybeSelectedProducts.value,
                product.id,
              ),
            name: product.name,
            status: product.status,
          }
        },
      ),
      total: productListData.total,
    },
  } satisfies Model
}
