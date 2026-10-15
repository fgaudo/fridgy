import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'

import * as NonEmptyHashSet from '@/libs/collections/non-empty-hash-set.ts'
import * as Engine from '@/libs/elm/engine.ts'
import type { Notifications } from '../ports/notifications.ts'
import type { Products } from '../ports/products.ts'
import type { Viewport } from '../ports/viewport.ts'
import * as Cmd from './commands.ts'
import * as Guards from './guards.ts'
import type { InternalMessage } from './messages.ts'
import { OperationId, type Product, type State } from './state.ts'

export type Deps = Products | Viewport | Notifications

const ProductEnum = Data.taggedEnum<Product>()

type Transition = Engine.Transition<State, InternalMessage, Deps>

/** Ids that can be referenced: every product except the corrupt ones. */
const idsOf = (items: ReadonlyArray<Product>) =>
  HashSet.fromIterable(Arr.flatMap(items, (product) => (product._tag === 'Corrupt' ? [] : [product.id])))

export const update = Match.typeTags<InternalMessage, (state: State) => Transition>()({
  // ---------------------------------------------------------------------------
  // The "add a product" form
  // ---------------------------------------------------------------------------

  AddProductToggled: () => (state) => {
    switch (state.addProduct._tag) {
      case 'Closed':
        return {
          state: {
            ...state,
            addProduct: { _tag: 'Editing', maybeName: Opt.none(), maybeExpirationDate: Opt.none() },
          },
        }
      case 'Editing':
        return { state: { ...state, addProduct: { _tag: 'Closed' } } }
      // The form stays open until the submission completes.
      case 'Submitting':
        return { state }
    }
  },

  // The inputs only exist while the form is open: a change arriving after it
  // was closed is stale. While submitting, the content is frozen.
  NameChanged: ({ name }) => (state) => {
    switch (state.addProduct._tag) {
      case 'Closed':
        return Engine.reject
      case 'Submitting':
        return { state }
      case 'Editing':
        // The raw text is kept as typed (the input is controlled by the
        // model); whether it is a valid name is decided when adding.
        return { state: { ...state, addProduct: { ...state.addProduct, maybeName: Opt.some(name) } } }
    }
  },

  ExpirationDateChanged: ({ expiration }) => (state) => {
    switch (state.addProduct._tag) {
      case 'Closed':
        return Engine.reject
      case 'Submitting':
        return { state }
      case 'Editing':
        return {
          state: {
            ...state,
            addProduct: { ...state.addProduct, maybeExpirationDate: DateTime.make(expiration) },
          },
        }
    }
  },

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

  // Success closes the form; failure gives it back, as it was, to retry.
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

  // ---------------------------------------------------------------------------
  // The product list
  // ---------------------------------------------------------------------------

  // Every change is validated by a command; only the latest validation counts,
  // so that results arriving out of order cannot overwrite newer data.
  ProductsChanged: ({ result }) => (state) => {
    const validation = state.nextOperation
    return {
      state: { ...state, nextOperation: OperationId.next(validation), latestValidation: Opt.some(validation) },
      commands: [Cmd.validateProducts(validation, result)],
    }
  },

  ProductsValidated: ({ validation, result }) => (state) => {
    if (!Opt.contains(state.latestValidation, validation)) {
      return Engine.reject
    }
    if (Result.isFailure(result)) {
      return { state: { ...state, products: { _tag: 'Failed' } } }
    }
    // Invalid products that still have an id can be selected and deleted; the
    // ones without an id cannot be referenced at all.
    const items = Opt.match(result.success, {
      onNone: (): ReadonlyArray<Product> => [],
      onSome: Arr.map((product): Product =>
        product._tag === 'Valid'
          ? product
          : Opt.match(product.maybeId, {
            onNone: () => ProductEnum.Corrupt({ maybeName: product.maybeName }),
            onSome: (id) => ProductEnum.Invalid({ id, maybeName: product.maybeName }),
          })
      ),
    })
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

  // ---------------------------------------------------------------------------
  // Selection and deletion
  // ---------------------------------------------------------------------------

  ItemToggled: ({ id }) => (state) => {
    if (!Guards.canToggleItems(state)) {
      return Engine.reject
    }
    const maybeIds = state.selection.maybeIds.pipe(
      Opt.match({
        onNone: () => HashSet.make(id),
        onSome: (ids) => (HashSet.has(ids, id) ? HashSet.remove(ids, id) : HashSet.add(ids, id)),
      }),
      NonEmptyHashSet.make,
    )
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

  // Success clears the selection; failure gives it back, to retry.
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

  // ---------------------------------------------------------------------------
  // Menu and viewport
  // ---------------------------------------------------------------------------

  MenuToggled: () => (state) => ({ state: { ...state, isMenuOpen: !state.isMenuOpen } }),

  InteractionChanged: ({ isInteracting }) => (state) => ({ state: { ...state, isInteracting } }),

  ViewportAtTopChanged: ({ isAtTop }) => (state) => ({ state: { ...state, isViewportAtTop: isAtTop } }),

  ViewportCloseToTopChanged: ({ isCloseToTop }) => (state) => ({
    state,
    commands: !state.isInteracting && isCloseToTop ? [Cmd.scrollToTop] : [],
  }),

  NoOp: () => (state) => ({ state }),
})

export const init: Engine.Step<State, InternalMessage, Deps> = {
  state: {
    isMenuOpen: false,
    isViewportAtTop: true,
    isInteracting: false,
    nextOperation: OperationId.first,
    latestValidation: Opt.none(),
    products: { _tag: 'Loading' },
    selection: { _tag: 'Selecting', maybeIds: Opt.none() },
    addProduct: { _tag: 'Closed' },
  },
}
