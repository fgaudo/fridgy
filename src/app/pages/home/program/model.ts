import * as Arr from 'effect/Array'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as PositiveInteger from '@/libs/numbers/positive-integer.ts'
import type * as UnitInterval from '@/libs/numbers/unit-interval.ts'
import { type InputOffer, type Offer, type Offers, offers } from '@fgaudo/effect-tea'
import * as Domain from '../../../domain/product.ts'
import { Message } from './messages.ts'
import type * as State from './state.ts'
import { update } from './update.ts'

export type ProductModel = Data.TaggedEnum<{
  /** Cannot be referenced, so nothing can be done with it. */
  Corrupt: Readonly<{
    maybeName: Opt.Option<string>
  }>
  Invalid: Readonly<{
    /** Selects the product, or deselects it when selected. */
    changeSelection: Offer<Message>
    isSelected: boolean
    id: string
    maybeName: Opt.Option<string>
  }>
  Valid: Readonly<{
    changeSelection: Offer<Message>
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
  openMenu: Offer<Message>
  closeMenu: Offer<Message>
  requestInfo: Offer<Message>
  isInteracting: boolean
  isViewportAtTop: boolean
  openAddProduct: Offer<Message>
  addProduct: Data.TaggedEnum<{
    Open: {
      name: string
      expirationDate: string | number
      isSubmitting: boolean
      submit: Offer<Message>
      close: Offer<Message>
      // What is typed is never a reason to reject: these depend on the state only.
      changeName: InputOffer<string, Message>
      changeExpiration: InputOffer<string, Message>
    }
    Closed: object
  }>
  productListStatus: Data.TaggedEnum<{
    Initial: object
    Error: object
    Empty: object
    Available: Readonly<{
      isDeleting: boolean
      deleteSelected: Offer<Message>
      clearSelection: Offer<Message>
      total: PositiveInteger.PositiveInteger
      products: Arr.NonEmptyReadonlyArray<ProductModel>
    }>
  }>
}>

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

const makeAddProduct = (state: State.State, { offer, offerInput }: Offers<Message>): Model['addProduct'] => {
  if (state.addProduct._tag === 'Closed') {
    return { _tag: 'Closed' }
  }
  const name = Opt.getOrElse(state.addProduct.maybeName, () => '')
  // The format of `<input type="date">`.
  const expirationDate = Opt.match(state.addProduct.maybeExpirationDate, {
    onNone: () => '',
    onSome: DateTime.formatIsoDateUtc,
  })
  return {
    _tag: 'Open',
    name,
    expirationDate,
    isSubmitting: state.addProduct._tag === 'Submitting',
    submit: offer(Message.AddProductStarted()),
    close: offer(Message.AddProductClosed()),
    changeName: offerInput((name: string) => Message.NameChanged({ name }), name),
    changeExpiration: offerInput((expiration: string) => Message.ExpirationDateChanged({ expiration }), expirationDate),
  }
}

const makeProductList = (state: State.State, { offer }: Offers<Message>): Model['productListStatus'] => {
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
  const changeSelection = (id: string) =>
    Opt.orElse(offer(Message.ItemSelected({ id })), () => offer(Message.ItemDeselected({ id })))
  return {
    _tag: 'Available',
    isDeleting: selection._tag === 'Deleting',
    deleteSelected: offer(Message.DeleteStarted()),
    clearSelection: offer(Message.ClearSelected()),
    total: PositiveInteger.makeUnsafe(items.length),
    products: Arr.map(items, (product): ProductModel => {
      switch (product._tag) {
        case 'Corrupt':
          return { _tag: 'Corrupt', maybeName: product.maybeName }
        case 'Invalid':
          return {
            _tag: 'Invalid',
            changeSelection: changeSelection(product.id),
            id: product.id,
            isSelected: isSelected(product.id),
            maybeName: product.maybeName,
          }
        case 'Valid':
          return {
            _tag: 'Valid',
            changeSelection: changeSelection(product.id),
            id: product.id,
            isSelected: isSelected(product.id),
            name: Domain.name(product.product),
            status: statusAt(now, product.product),
          }
      }
    }),
  }
}

export const makeModel = (state: State.State): Model => {
  const offering = offers(update, state)
  const { offer } = offering
  return {
    isMenuOpen: state.isMenuOpen,
    openMenu: offer(Message.MenuOpened()),
    closeMenu: offer(Message.MenuClosed()),
    requestInfo: offer(Message.InfoRequested()),
    isInteracting: state.isInteracting,
    isViewportAtTop: state.isViewportAtTop,
    openAddProduct: offer(Message.AddProductOpened()),
    addProduct: makeAddProduct(state, offering),
    productListStatus: makeProductList(state, offering),
  }
}
