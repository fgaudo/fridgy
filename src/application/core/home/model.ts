import * as Arr from 'effect/Array'
import * as Brand from 'effect/Brand'
import type * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import { InternalMessage, type Message } from '@/app/core/home/messages.ts'
import type * as PositiveInteger from '@/shared/integer/positive-integer.ts'
import type * as NonEmptyHashSet from '@/shared/non-empty-hash-set.ts'
import type * as UnitInterval from '@/shared/unit-interval.ts'

export type Model = Readonly<{
  isMenuOpen: boolean
  isInteracting: boolean
  isViewportAtTop: boolean
  canNavigateOut: boolean
  canFetch: Data.TaggedEnum<{
    True: Readonly<{ fetch: Message }>
    False: object
  }>
  addProduct: {
    name: string
    expirationDate: string | number
    isSubmittable: Data.TaggedEnum<{
      True: { submit: Message }
      False: object
    }>
  }
  productListStatus: Data.TaggedEnum<{
    Initial: { activity: 'fetching' | 'idle' | 'adding' }
    Error: { activity: 'fetching' | 'idle' | 'adding' }
    Empty: { activity: 'fetching' | 'idle' | 'adding' }
    Available: Readonly<{
      activity: 'fetching' | 'idle' | 'deleting' | 'adding'
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
            isSelected: boolean
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
  isViewportCloseToTop: boolean
  isInteracting: boolean
  versions: {
    manualFetcher: FetchListVersion
  }
  addProduct: {
    isSubmittable: boolean
    maybeName: Opt.Option<string>
    maybeExpirationDate: Opt.Option<DateTime.Utc>
  }
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
      isMenuOpen: state.isMenuOpen,
      isViewportAtTop: state.isViewportAtTop,
      isInteracting: state.isInteracting,
      canFetch: { _tag: 'False' },
      canNavigateOut: true,
      productListStatus: {
        _tag: 'Initial',
        activity: state.productListData.activity,
      },
    } satisfies Model
  }
  if (state.productListData._tag !== 'Available') {
    return {
      isMenuOpen: state.isMenuOpen,
      isViewportAtTop: state.isViewportAtTop,
      isInteracting: state.isInteracting,
      canFetch: state.productListData.activity === 'fetching'
        ? { _tag: 'False' }
        : { _tag: 'True', fetch: InternalMessage.FetchStarted() },
      canNavigateOut: true,
      productListStatus: state.productListData,
    } satisfies Model
  }
  const productListData = state.productListData
  return {
    isMenuOpen: state.isMenuOpen,
    isViewportAtTop: state.isViewportAtTop,
    isInteracting: state.isInteracting,
    canFetch: productListData.activity !== 'deleting'
        && productListData.activity !== 'fetching'
      ? { _tag: 'True', fetch: InternalMessage.FetchStarted() }
      : { _tag: 'False' },
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
