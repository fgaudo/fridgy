import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'

import * as NonEmptyHashSet from '@/libs/collections/non-empty-hash-set.ts'
import * as Engine from '@/libs/elm/engine.ts'
import * as Domain from '../../../domain/product.ts'
import type { Notifications } from '../ports/notifications.ts'
import type { StoredProduct } from '../ports/product-list.ts'
import type { ProductCommands } from '../../../ports/product-commands.ts'
import type { Viewport } from '../ports/viewport.ts'
import * as Cmd from './commands.ts'
import * as Guards from './guards.ts'
import { Event, type Message } from './messages.ts'
import { OperationId, type Product, type State } from './state.ts'

export type Deps = ProductCommands | Viewport | Notifications

const ProductEnum = Data.taggedEnum<Product>()

type Transition = Engine.Transition<State, Message, Deps, Event>

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

export const update = Match.typeTags<Message, (state: State) => Transition>()({
  AddProductOpened: () => (state) =>
    Guards.canOpenAddProduct(state)
      ? {
        state: {
          ...state,
          addProduct: { _tag: 'Editing', maybeName: Opt.none(), maybeExpirationDate: Opt.none() },
        },
      }
      : Engine.reject,

  // The form stays open until the submission completes.
  AddProductClosed: () => (state) =>
    Guards.canEditAddProduct(state) ? { state: { ...state, addProduct: { _tag: 'Closed' } } } : Engine.reject,

  // While submitting, the content is frozen: the inputs dispatch nothing.
  NameChanged: ({ name }) => (state) =>
    Guards.canEditAddProduct(state)
      // The raw text is kept as typed (the input is controlled by the model);
      // whether it is a valid name is decided when adding.
      ? { state: { ...state, addProduct: { ...state.addProduct, maybeName: Opt.some(name) } } }
      : Engine.reject,

  ExpirationDateChanged: ({ expiration }) => (state) =>
    Guards.canEditAddProduct(state)
      ? {
        state: {
          ...state,
          addProduct: { ...state.addProduct, maybeExpirationDate: DateTime.make(expiration) },
        },
      }
      : Engine.reject,

  AddProductStarted: () => (state) => {
    if (!Guards.canStartAdding(state)) {
      return Engine.reject
    }
    const operation = state.nextOperation
    const { maybeName, maybeExpirationDate } = state.addProduct
    return {
      state: {
        ...state,
        nextOperation: OperationId.next(operation),
        addProduct: { _tag: 'Submitting', operation, maybeName, maybeExpirationDate },
      },
      commands: [Cmd.addProduct(operation, { maybeName, maybeExpirationDate })],
    }
  },

  AddProductCompleted: ({ operation, succeeded }) => (state) => {
    if (state.addProduct._tag !== 'Submitting' || state.addProduct.operation !== operation) {
      return Engine.reject
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
    if (!Guards.canSelectItem(id)(state)) {
      return Engine.reject
    }
    const ids = Opt.match(state.selection.maybeIds, {
      onNone: () => HashSet.make(id),
      onSome: HashSet.add(id),
    })
    return { state: { ...state, selection: { _tag: 'Selecting', maybeIds: Opt.some(NonEmptyHashSet.makeUnsafe(ids)) } } }
  },

  ItemDeselected: ({ id }) => (state) => {
    if (!Guards.canDeselectItem(id)(state)) {
      return Engine.reject
    }
    const maybeIds = NonEmptyHashSet.make(HashSet.remove(state.selection.maybeIds.value, id))
    return { state: { ...state, selection: { _tag: 'Selecting', maybeIds } } }
  },

  ClearSelected: () => (state) => {
    if (!Guards.canClearSelection(state)) {
      return Engine.reject
    }
    return { state: { ...state, selection: { _tag: 'Selecting', maybeIds: Opt.none() } } }
  },

  DeleteStarted: () => (state) => {
    if (!Guards.canDeleteSelected(state)) {
      return Engine.reject
    }
    const operation = state.nextOperation
    const ids = state.selection.maybeIds.value
    return {
      state: {
        ...state,
        nextOperation: OperationId.next(operation),
        selection: { _tag: 'Deleting', operation, ids },
      },
      commands: [Cmd.deleteProducts({ operation, ids })],
    }
  },

  DeleteProductsCompleted: ({ operation, succeeded }) => (state) => {
    if (state.selection._tag !== 'Deleting' || state.selection.operation !== operation) {
      return Engine.reject
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
    Guards.canRequestInfo(state)
      ? { state: { ...state, isMenuOpen: false }, events: [Event.InfoRequested()] }
      : Engine.reject,

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

  MenuOpened: () => (state) => Guards.canOpenMenu(state) ? { state: { ...state, isMenuOpen: true } } : Engine.reject,

  MenuClosed: () => (state) => Guards.canCloseMenu(state) ? { state: { ...state, isMenuOpen: false } } : Engine.reject,

  InteractionChanged: ({ isInteracting }) => (state) => ({ state: { ...state, isInteracting } }),

  ViewportAtTopChanged: ({ isAtTop }) => (state) => ({ state: { ...state, isViewportAtTop: isAtTop } }),

  ViewportCloseToTopChanged: ({ isCloseToTop }) => (state) => ({
    state,
    commands: !state.isInteracting && isCloseToTop ? [Cmd.scrollToTop] : [],
  }),

})

export const init: Engine.Step<State, Message, Deps> = {
  state: {
    isMenuOpen: false,
    isViewportAtTop: true,
    isInteracting: false,
    nextOperation: OperationId.first,
    maybeNow: Opt.none(),
    products: { _tag: 'Loading' },
    selection: { _tag: 'Selecting', maybeIds: Opt.none() },
    addProduct: { _tag: 'Closed' },
  },
}
