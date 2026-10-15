import * as Arr from 'effect/Array'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as PositiveInteger from '@/libs/numbers/positive-integer.ts'
import type * as UnitInterval from '@/libs/numbers/unit-interval.ts'
import * as Guards from './guards.ts'
import { InternalMessage } from './messages.ts'
import type * as State from './state.ts'

/** An action the view may trigger, with the message to dispatch, or not. */
type Availability<Fields> = Readonly<{ _tag: 'True' } & Fields> | Readonly<{ _tag: 'False' }>

type ProductModel = Data.TaggedEnum<{
  Corrupt: Readonly<{
    canToggle: Data.TaggedEnum<{ False: object }>
    maybeName: Opt.Option<string>
  }>
  Invalid: Readonly<{
    canToggle: Availability<{ message: InternalMessage }>
    isSelected: boolean
    id: string
    maybeName: Opt.Option<string>
  }>
  Valid: Readonly<{
    canToggle: Availability<{ message: InternalMessage }>
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

export type Model = Readonly<{
  isMenuOpen: boolean
  isInteracting: boolean
  isViewportAtTop: boolean
  canNavigateOut: boolean
  addProduct: Data.TaggedEnum<{
    Open: {
      name: string
      expirationDate: string | number
      isSubmitting: boolean
      isSubmittable: Availability<{ submit: InternalMessage }>
    }
    Closed: object
  }>
  productListStatus: Data.TaggedEnum<{
    Initial: object
    Error: object
    Empty: object
    Available: Readonly<{
      isDeleting: boolean
      canDeleteSelected: Availability<{ deleteMessage: InternalMessage }>
      canClearSelection: Availability<{ clearMessage: InternalMessage }>
      total: PositiveInteger.PositiveInteger
      products: Arr.NonEmptyReadonlyArray<ProductModel>
    }>
  }>
}>

const makeAddProduct = (state: State.State): Model['addProduct'] => {
  if (state.addProduct._tag === 'Closed') {
    return { _tag: 'Closed' }
  }
  return {
    _tag: 'Open',
    name: Opt.getOrElse(state.addProduct.maybeName, () => ''),
    // The format of `<input type="date">`.
    expirationDate: Opt.match(state.addProduct.maybeExpirationDate, {
      onNone: () => '',
      onSome: DateTime.formatIsoDateUtc,
    }),
    isSubmitting: state.addProduct._tag === 'Submitting',
    isSubmittable: Guards.canStartAdding(state)
      ? { _tag: 'True', submit: InternalMessage.AddProductStarted() }
      : { _tag: 'False' },
  }
}

const makeProductList = (state: State.State): Model['productListStatus'] => {
  if (state.products._tag === 'Loading') {
    return { _tag: 'Initial' }
  }
  if (state.products._tag === 'Failed') {
    return { _tag: 'Error' }
  }
  const items = state.products.items
  if (!Arr.isReadonlyArrayNonEmpty(items)) {
    return { _tag: 'Empty' }
  }
  const selection = state.selection
  const isSelected = (id: string) =>
    selection._tag === 'Deleting'
      ? HashSet.has(selection.ids, id)
      : Opt.exists(selection.maybeIds, HashSet.has(id))
  const canToggle = (id: string) =>
    Guards.canToggleItems(state)
      ? { _tag: 'True', message: InternalMessage.ItemToggled({ id }) } as const
      : { _tag: 'False' } as const
  return {
    _tag: 'Available',
    isDeleting: selection._tag === 'Deleting',
    canDeleteSelected: Guards.canDeleteSelected(state)
      ? { _tag: 'True', deleteMessage: InternalMessage.DeleteStarted() }
      : { _tag: 'False' },
    canClearSelection: Guards.canClearSelection(state)
      ? { _tag: 'True', clearMessage: InternalMessage.ClearSelected() }
      : { _tag: 'False' },
    total: PositiveInteger.fromNumberUnsafe(items.length),
    products: Arr.map(items, (product): ProductModel => {
      switch (product._tag) {
        case 'Corrupt':
          return { _tag: 'Corrupt', canToggle: { _tag: 'False' }, maybeName: product.maybeName }
        case 'Invalid':
          return {
            _tag: 'Invalid',
            canToggle: canToggle(product.id),
            id: product.id,
            isSelected: isSelected(product.id),
            maybeName: product.maybeName,
          }
        case 'Valid':
          return {
            _tag: 'Valid',
            canToggle: canToggle(product.id),
            id: product.id,
            isSelected: isSelected(product.id),
            name: product.name,
            status: product.status,
          }
      }
    }),
  }
}

export const makeModel = (state: State.State): Model => ({
  isMenuOpen: state.isMenuOpen,
  isInteracting: state.isInteracting,
  isViewportAtTop: state.isViewportAtTop,
  canNavigateOut: state.selection._tag !== 'Deleting',
  addProduct: makeAddProduct(state),
  productListStatus: makeProductList(state),
})
