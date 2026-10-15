import * as Arr from 'effect/Array'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as PositiveInteger from '@/libs/numbers/positive-integer.ts'
import type * as UnitInterval from '@/libs/numbers/unit-interval.ts'
import * as Domain from '../../../domain/product.ts'
import * as Guards from './guards.ts'
import { Message } from './messages.ts'
import type * as State from './state.ts'

type Availability<Fields> = Readonly<{ _tag: 'True' } & Fields> | Readonly<{ _tag: 'False' }>

type ProductModel = Data.TaggedEnum<{
  Corrupt: Readonly<{
    canToggle: Data.TaggedEnum<{ False: object }>
    maybeName: Opt.Option<string>
  }>
  Invalid: Readonly<{
    canToggle: Availability<{ message: Message }>
    isSelected: boolean
    id: string
    maybeName: Opt.Option<string>
  }>
  Valid: Readonly<{
    canToggle: Availability<{ message: Message }>
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
  canOpenMenu: Availability<{ message: Message }>
  canCloseMenu: Availability<{ message: Message }>
  canRequestInfo: Availability<{ message: Message }>
  isInteracting: boolean
  isViewportAtTop: boolean
  canOpenAddProduct: Availability<{ message: Message }>
  addProduct: Data.TaggedEnum<{
    Open: {
      name: string
      expirationDate: string | number
      isSubmitting: boolean
      isSubmittable: Availability<{ submit: Message }>
      canClose: Availability<{ message: Message }>
      canEdit: Availability<{
        nameChanged: (name: string) => Message
        expirationChanged: (expiration: string) => Message
      }>
    }
    Closed: object
  }>
  productListStatus: Data.TaggedEnum<{
    Initial: object
    Error: object
    Empty: object
    Available: Readonly<{
      isDeleting: boolean
      canDeleteSelected: Availability<{ deleteMessage: Message }>
      canClearSelection: Availability<{ clearMessage: Message }>
      total: PositiveInteger.PositiveInteger
      products: Arr.NonEmptyReadonlyArray<ProductModel>
    }>
  }>
}>

const offer = (isAvailable: boolean, message: Message): Availability<{ message: Message }> =>
  isAvailable ? { _tag: 'True', message } : { _tag: 'False' }

type ProductStatus = Data.TaggedEnum.Value<ProductModel, 'Valid'>['status']

const statusAt = (now: DateTime.Utc, product: Domain.Product): ProductStatus =>
  Opt.match(Domain.maybeExpiration(product), {
    onNone: () => ({ _tag: 'Everlasting' }),
    onSome: (expiration) => {
      const expirationDate = Domain.expirationDate(expiration)
      const status = Domain.expirationStatus(now)(expiration)
      return status.hasExpired
        ? { _tag: 'Stale', expirationDate }
        : { _tag: 'Fresh', expirationDate, timeLeft: status.timeLeft, freshnessRatio: status.freshness }
    },
  })

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
      ? { _tag: 'True', submit: Message.AddProductStarted() }
      : { _tag: 'False' },
    canClose: offer(Guards.canEditAddProduct(state), Message.AddProductClosed()),
    canEdit: Guards.canEditAddProduct(state)
      ? {
        _tag: 'True',
        nameChanged: (name) => Message.NameChanged({ name }),
        expirationChanged: (expiration) => Message.ExpirationDateChanged({ expiration }),
      }
      : { _tag: 'False' },
  }
}

const makeProductList = (state: State.State): Model['productListStatus'] => {
  if (state.products._tag === 'Loading' || Opt.isNone(state.maybeNow)) {
    return { _tag: 'Initial' }
  }
  const now = state.maybeNow.value
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
  // Offers whichever of selecting or deselecting the product is possible now.
  const canToggle = (id: string) =>
    Guards.canSelectItem(id)(state)
      ? offer(true, Message.ItemSelected({ id }))
      : offer(Guards.canDeselectItem(id)(state), Message.ItemDeselected({ id }))
  return {
    _tag: 'Available',
    isDeleting: selection._tag === 'Deleting',
    canDeleteSelected: Guards.canDeleteSelected(state)
      ? { _tag: 'True', deleteMessage: Message.DeleteStarted() }
      : { _tag: 'False' },
    canClearSelection: Guards.canClearSelection(state)
      ? { _tag: 'True', clearMessage: Message.ClearSelected() }
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
            name: Domain.name(product.product),
            status: statusAt(now, product.product),
          }
      }
    }),
  }
}

export const makeModel = (state: State.State): Model => ({
  isMenuOpen: state.isMenuOpen,
  canOpenMenu: offer(Guards.canOpenMenu(state), Message.MenuOpened()),
  canCloseMenu: offer(Guards.canCloseMenu(state), Message.MenuClosed()),
  canRequestInfo: offer(Guards.canRequestInfo(state), Message.InfoRequested()),
  isInteracting: state.isInteracting,
  isViewportAtTop: state.isViewportAtTop,
  canOpenAddProduct: offer(Guards.canOpenAddProduct(state), Message.AddProductOpened()),
  addProduct: makeAddProduct(state),
  productListStatus: makeProductList(state),
})
