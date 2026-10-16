import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'

import * as NonEmptyHashSet from '@/libs/collections/non-empty-hash-set.ts'
import * as Tea from '@fgaudo/effect-tea'
import * as NormalizedString from '@/libs/strings/normalized-string.ts'
import * as Domain from '../../../domain/product.ts'
import type { Notifications } from '../ports/notifications.ts'
import type { StoredProduct } from '../ports/product-list.ts'
import type { ProductCommands } from '../../../ports/product-commands.ts'
import type { Viewport } from '../ports/viewport.ts'
import * as Cmd from './commands.ts'
import { Event, type Message } from './messages.ts'
import type { Product, State } from './state.ts'

export type Deps = ProductCommands | Viewport | Notifications

const ProductEnum = Data.taggedEnum<Product>()

type Transition = Tea.Transition<State, Message, Deps, Event>

// Products that still have an id can be selected and deleted, even when invalid;
// the ones without an id cannot be referenced at all.
const validate = (stored: StoredProduct): Product =>
  Opt.match(stored.maybeId, {
    onNone: () => ProductEnum.Corrupt({ maybeName: stored.maybeName }),
    onSome: (id) =>
      Opt.match(Domain.fromSnapshot(stored), {
        onNone: () => ProductEnum.Invalid({ id, maybeName: stored.maybeName }),
        onSome: (product) => ProductEnum.Valid({ id, product }),
      }),
  })

const idsOf = (items: ReadonlyArray<Product>) =>
  HashSet.fromIterable(Arr.flatMap(items, (product) => (product._tag === 'Corrupt' ? [] : [product.id])))

// Conditions shared by several messages. The model learns what is possible by
// asking `update` itself (see `model.ts`), so these stay private.
type Editing = Data.TaggedEnum.Value<State['addProduct'], 'Editing'>
type Selecting = Data.TaggedEnum.Value<State['selection'], 'Selecting'>
type Loaded = Data.TaggedEnum.Value<State['products'], 'Loaded'>
type WithSelection = Selecting & { readonly maybeIds: Opt.Some<NonEmptyHashSet.NonEmptyHashSet<string>> }

/** The form is closed, or edited, only while it is not being submitted. */
const isEditing = (state: State): state is State & { readonly addProduct: Editing } =>
  state.addProduct._tag === 'Editing'

const canChangeSelection = (
  state: State,
): state is State & { readonly products: Loaded; readonly selection: Selecting } =>
  state.products._tag === 'Loaded' && state.selection._tag === 'Selecting'

const hasSelection = (state: State): state is State & { readonly selection: WithSelection } =>
  state.selection._tag === 'Selecting' && Opt.isSome(state.selection.maybeIds)

const isSelected = (selection: Selecting, id: string) => Opt.exists(selection.maybeIds, HashSet.has(id))

export const update = Match.typeTags<Message, (state: State) => Transition>()({
  AddProductOpened: () => (state) =>
    state.addProduct._tag === 'Closed'
      ? {
        state: {
          ...state,
          addProduct: { _tag: 'Editing', maybeName: Opt.none(), maybeExpirationDate: Opt.none() },
        },
      }
      : Tea.reject,

  // The form stays open until the submission completes.
  AddProductClosed: () => (state) =>
    isEditing(state) ? { state: { ...state, addProduct: { _tag: 'Closed' } } } : Tea.reject,

  // While submitting, the content is frozen: the inputs dispatch nothing.
  NameChanged: ({ name }) => (state) =>
    isEditing(state)
      // The raw text is kept as typed (the input is controlled by the model);
      // whether it is a valid name is decided when adding.
      ? { state: { ...state, addProduct: { ...state.addProduct, maybeName: Opt.some(name) } } }
      : Tea.reject,

  ExpirationDateChanged: ({ expiration }) => (state) =>
    isEditing(state)
      ? {
        state: {
          ...state,
          addProduct: { ...state.addProduct, maybeExpirationDate: DateTime.make(expiration) },
        },
      }
      : Tea.reject,

  AddProductStarted: () => (state) => {
    if (
      !isEditing(state)
      || !Opt.exists(state.addProduct.maybeName, (name) => Opt.isSome(NormalizedString.fromString(name)))
    ) {
      return Tea.reject
    }
    const { maybeName, maybeExpirationDate } = state.addProduct
    return {
      state: { ...state, addProduct: { _tag: 'Submitting', maybeName, maybeExpirationDate } },
      commands: [Cmd.addProduct({ maybeName, maybeExpirationDate })],
    }
  },

  AddProductCompleted: ({ succeeded }) => (state) => {
    if (state.addProduct._tag !== 'Submitting') {
      return Tea.reject
    }
    const { maybeName, maybeExpirationDate } = state.addProduct
    return succeeded
      ? { state: { ...state, addProduct: { _tag: 'Closed' } } }
      : {
        state: { ...state, addProduct: { _tag: 'Editing', maybeName, maybeExpirationDate } },
        commands: [Cmd.showToast('Could not add the product')],
      }
  },

  ProductsChanged: ({ result }) => (state) => {
    if (Result.isFailure(result)) {
      return { state: { ...state, products: { _tag: 'Failed' } } }
    }
    const items = Arr.map(result.success, validate)
    return {
      state: {
        ...state,
        products: { _tag: 'Loaded', items },
        // The selection keeps the products that still exist; a deletion in
        // progress is left alone.
        selection: state.selection._tag === 'Selecting'
          ? {
            _tag: 'Selecting',
            maybeIds: Opt.flatMap(
              state.selection.maybeIds,
              (ids) => NonEmptyHashSet.make(HashSet.intersection(ids, idsOf(items))),
            ),
          }
          : state.selection,
      },
    }
  },

  TimeChanged: ({ now }) => (state) => ({ state: { ...state, maybeNow: Opt.some(now) } }),

  ItemSelected: ({ id }) => (state) => {
    if (!canChangeSelection(state) || isSelected(state.selection, id)) {
      return Tea.reject
    }
    const ids = Opt.match(state.selection.maybeIds, {
      onNone: () => HashSet.make(id),
      onSome: HashSet.add(id),
    })
    return {
      state: { ...state, selection: { _tag: 'Selecting', maybeIds: Opt.some(NonEmptyHashSet.makeUnsafe(ids)) } },
    }
  },

  ItemDeselected: ({ id }) => (state) => {
    if (!canChangeSelection(state) || !hasSelection(state) || !isSelected(state.selection, id)) {
      return Tea.reject
    }
    const maybeIds = NonEmptyHashSet.make(HashSet.remove(state.selection.maybeIds.value, id))
    return { state: { ...state, selection: { _tag: 'Selecting', maybeIds } } }
  },

  ClearSelected: () => (state) => {
    if (!hasSelection(state)) {
      return Tea.reject
    }
    return { state: { ...state, selection: { _tag: 'Selecting', maybeIds: Opt.none() } } }
  },

  DeleteStarted: () => (state) => {
    if (!(state.products._tag === 'Loaded' && hasSelection(state))) {
      return Tea.reject
    }
    const ids = state.selection.maybeIds.value
    return {
      state: { ...state, selection: { _tag: 'Deleting', ids } },
      commands: [Cmd.deleteProducts(ids)],
    }
  },

  DeleteProductsCompleted: ({ succeeded }) => (state) => {
    if (state.selection._tag !== 'Deleting') {
      return Tea.reject
    }
    return succeeded
      ? { state: { ...state, selection: { _tag: 'Selecting', maybeIds: Opt.none() } } }
      : {
        state: { ...state, selection: { _tag: 'Selecting', maybeIds: Opt.some(state.selection.ids) } },
        commands: [Cmd.showToast('Could not delete the products')],
      }
  },

  // Asked from the side menu, which closes on the way.
  InfoRequested: () => (state) =>
    state.isMenuOpen
      ? { state: { ...state, isMenuOpen: false }, events: [Event.InfoRequested()] }
      : Tea.reject,

  // Closes what is open, innermost first; with nothing to close, asks to leave.
  BackPressed: () => (state) => {
    if (state.isMenuOpen) {
      return { state: { ...state, isMenuOpen: false } }
    }
    switch (state.addProduct._tag) {
      case 'Editing':
        return { state: { ...state, addProduct: { _tag: 'Closed' } } }
      // The form cannot be closed while it is being submitted.
      case 'Submitting':
        return { state }
      case 'Closed':
        return { state, events: [Event.LeaveRequested()] }
    }
  },

  MenuOpened: () => (state) => !state.isMenuOpen ? { state: { ...state, isMenuOpen: true } } : Tea.reject,

  MenuClosed: () => (state) => state.isMenuOpen ? { state: { ...state, isMenuOpen: false } } : Tea.reject,

  InteractionChanged: ({ isInteracting }) => (state) => ({ state: { ...state, isInteracting } }),

  ViewportAtTopChanged: ({ isAtTop }) => (state) => ({ state: { ...state, isViewportAtTop: isAtTop } }),

  ViewportCloseToTopChanged: ({ isCloseToTop }) => (state) => ({
    state,
    commands: !state.isInteracting && isCloseToTop ? [Cmd.scrollToTop] : [],
  }),
})

export const init: Tea.Step<State, Message, Deps> = {
  state: {
    isMenuOpen: false,
    isViewportAtTop: true,
    isInteracting: false,
    maybeNow: Opt.none(),
    products: { _tag: 'Loading' },
    selection: { _tag: 'Selecting', maybeIds: Opt.none() },
    addProduct: { _tag: 'Closed' },
  },
}
