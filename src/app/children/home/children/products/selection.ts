// The selection of `Products`: some of the listed products, `Idle` while there are none, and their deletion, which
// only its completion leaves. The snackbar tells of the last deletion, offering to undo it for a few seconds, or of a
// failure.
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type * as SnackbarProgram from '#app/programs/snackbar/program.ts'
import * as Domain from '#domain/product.ts'
import { type BackButton, pressesAs } from '#infrastructure/back-button/back-button.ts'
import { ProductStore } from '#infrastructure/storage/products.ts'
import * as NonEmptyHashSet from '#libs/collections/non-empty-hash-set.ts'
import * as PositiveInteger from '#libs/numbers/positive-integer.ts'
import type { Presence, Product } from './list.ts'
import type { Command, Event, Outputs, State, Step, Tell, Transition } from './program.ts'

/**
 * The products being deleted, when every one of them is a product: only then can the deletion be undone, by
 * storing them again. Stored data that is not a product is gone for good.
 */
type Restorable = Opt.Option<Arr.NonEmptyReadonlyArray<Domain.Product>>

export type Selection = Data.TaggedEnum<{
  Idle: object
  Selecting: Readonly<{ ids: NonEmptyHashSet.NonEmptyHashSet<Domain.ProductId> }>
  // Left only by its completion: with commands that cannot be cancelled, a
  // completion always belongs to the deletion in progress, so it needs no id.
  Deleting: Readonly<{ ids: NonEmptyHashSet.NonEmptyHashSet<Domain.ProductId>; maybeProducts: Restorable }>
}>

const Selection = Data.taggedEnum<Selection>()

/** What the snackbar tells. */
export type Notice = Data.TaggedEnum<{
  /** The last deletion, which the snackbar offers to undo while its products can come back. */
  Deleted: Readonly<{ count: PositiveInteger.PositiveInteger; maybeProducts: Restorable }>
  DeleteFailed: object
  RestoreFailed: object
}>

const Notice = Data.taggedEnum<Notice>()

export type Message = Data.TaggedEnum<{
  // From the view.
  /** A long press says so with a vibration; a tap does not. */
  ItemSelected: { id: Domain.ProductId; by: Gesture }
  ItemDeselected: { id: Domain.ProductId; by: Gesture }
  /** A tap on a product while nothing is selected: opens it to be edited. */
  EditRequested: { id: Domain.ProductId }
  SelectionCleared: object
  DeleteStarted: object
  /** The snackbar's action: the products deleted last are stored again. */
  UndoRequested: object
  // From subscriptions.
  /** The back button, heard only while something is selected: it clears the selection, or waits for its deletion. */
  BackPressed: object
  // From commands.
  Deleted: object
  DeleteFailed: object
  RestoreFailed: object
}>

const Message = Data.taggedEnum<Message>()

const Command = Data.taggedEnum<Command>()

const Event = Data.taggedEnum<Event>()

export type Key = 'back-button'

/** How a row was selected or deselected. */
export type Gesture = 'Tap' | 'LongPress'

/** How a row looks, and what a long press and a tap on it do. */
export type ItemSelection = Readonly<{
  isSelected: boolean
  /** A long press: selects the row, or deselects it; nothing while the selected products are being deleted. */
  maybeToggle: Opt.Option<Message>
  /**
   * Opens the product while nothing is selected, as Material's lists do; toggles the row once something is.
   * Nothing on stored data that is not a product, while deleting, and on a row leaving.
   */
  maybeTap: Opt.Option<Message>
}>

/** What the list offers to do with the selection. */
export type Deletion = Data.TaggedEnum<{
  NothingSelected: object
  Possible: {
    count: PositiveInteger.PositiveInteger
    deleteSelected: Message
    clearSelection: Message
  }
  InProgress: object
}>

/** What the snackbar standing tells: `maybeUndo` only while the products deleted can come back. */
export type NoticeModel = Data.TaggedEnum<{
  Deleted: Readonly<{ count: PositiveInteger.PositiveInteger; maybeUndo: Opt.Option<Message> }>
  DeleteFailed: object
  RestoreFailed: object
}>

/** The snackbar standing. `id` tells one snackbar from the next. */
export type SnackbarModel = Opt.Option<
  Readonly<{ id: number; entrance: SnackbarProgram.Entrance; notice: NoticeModel }>
>

/** Only a long press vibrates, as Android's do: a tap is feedback enough. */
const feedbackOf = (by: Gesture): ReadonlyArray<Command> =>
  by === 'LongPress' ? [Command.Vibrate({ feedback: 'LongPress' })] : []

/** The products a notice offers to store again: those of a deletion that can be undone. */
const restorableOf = (notice: Notice): Restorable => notice._tag === 'Deleted' ? notice.maybeProducts : Opt.none()

/** What "Undo" stores again, while the snackbar standing offers it: `update` and `makeModel` both ask this. */
const undoable = (standing: Opt.Option<Notice>): Restorable => Opt.flatMap(standing, restorableOf)

/** A notice for the snackbar: Material's long duration for one with an action, to read it and reach for "Undo". */
const tell = (notice: Notice): Tell => ({
  _tag: 'Snackbar',
  message: { _tag: 'Told', notice, lasting: Opt.isSome(restorableOf(notice)) ? 'Long' : 'Short' },
})

const isListed = (items: ReadonlyArray<Product>, id: Domain.ProductId) => Arr.some(items, (item) => item.id === id)

/** Whether a product can be selected: one of the loaded products, while nothing is being deleted. */
const isSelectable = (state: State, id: Domain.ProductId) =>
  state.list._tag === 'Loaded' && state.selection._tag !== 'Deleting' && isListed(state.list.items, id)

/** The selection, as ids: empty when there is none. */
const selectedIds = (selection: Selection): HashSet.HashSet<Domain.ProductId> =>
  selection._tag === 'Idle' ? HashSet.empty() : selection.ids

/** The selection of exactly those ids: none when there are none. */
const selectionOf = (ids: HashSet.HashSet<Domain.ProductId>): Selection =>
  Opt.match(NonEmptyHashSet.make(ids), {
    onNone: () => Selection.Idle(),
    onSome: (ids) => Selection.Selecting({ ids }),
  })

/** The products the ids name, in the list's order, when every id names one. */
export const productsOf = (items: ReadonlyArray<Product>, ids: HashSet.HashSet<Domain.ProductId>): Restorable => {
  const isProduct = (id: Domain.ProductId) => items.some((item) => item._tag === 'Valid' && item.id === id)
  const products = Arr.flatMap(
    items,
    (item) => item._tag === 'Valid' && HashSet.has(ids, item.id) ? [item.product] : [],
  )
  return HashSet.every(ids, isProduct) && Arr.isReadonlyArrayNonEmpty(products) ? Opt.some(products) : Opt.none()
}

// Observed only while the list shows a selection: otherwise the press is Home's, or the platform's.
export const backButton: Tea.Subscription<Message, BackButton> = pressesAs(Message.BackPressed())

const showsSelection = (state: State) => state.list._tag === 'Loaded' && state.selection._tag !== 'Idle'

export const subscriptions = (state: State): ReadonlyArray<Key> => showsSelection(state) ? ['back-button'] : []

export const deleteProducts = Effect.fn('DeleteProducts')(
  function*({ ids }: Readonly<{ ids: NonEmptyHashSet.NonEmptyHashSet<Domain.ProductId> }>) {
    const { deleteAll } = yield* ProductStore
    yield* Effect.logDebug('Deleting products', { count: HashSet.size(ids) })
    yield* deleteAll(ids).pipe(
      Effect.tapError((error) => Effect.logWarning('Could not delete the products', error)),
    )
    yield* Effect.logInfo('Deleted products', { count: HashSet.size(ids) })
    return Message.Deleted()
  },
  Effect.orElseSucceed(() => Message.DeleteFailed()),
  Effect.asSome,
  Effect.withLogSpan('DeleteProducts'),
)

export const restoreProducts = Effect.fn('RestoreProducts')(
  function*({ products }: Readonly<{ products: Arr.NonEmptyReadonlyArray<Domain.Product> }>) {
    const { insertAll } = yield* ProductStore
    yield* Effect.logDebug('Putting products back', { count: products.length })
    yield* insertAll(Arr.map(products, Domain.toSnapshot)).pipe(
      Effect.tapError((error) => Effect.logWarning('Could not put the products back', error)),
    )
    yield* Effect.logInfo('Put products back', { count: products.length })
    return Opt.none()
  },
  Effect.orElseSucceed(() => Opt.some(Message.RestoreFailed())),
  Effect.withLogSpan('RestoreProducts'),
)

export const update = Match.typeTags<Message, (state: State, children: Outputs) => Transition>()({
  // Only a product of the list can be selected: a tap on a row the storage has meanwhile removed does nothing.
  ItemSelected: ({ id, by }) => (state) =>
    isSelectable(state, id) && !HashSet.has(selectedIds(state.selection), id)
      ? {
        state: { ...state, selection: selectionOf(HashSet.add(selectedIds(state.selection), id)) },
        commands: feedbackOf(by),
      }
      : Tea.reject,

  ItemDeselected: ({ id, by }) => (state) =>
    state.list._tag === 'Loaded' && state.selection._tag === 'Selecting' && HashSet.has(state.selection.ids, id)
      ? {
        state: { ...state, selection: selectionOf(HashSet.remove(state.selection.ids, id)) },
        commands: feedbackOf(by),
      }
      : Tea.reject,

  // Only a product of the list, while nothing is selected or deleted. The product goes with the event, as the
  // row shows it, so that no parent reads the list.
  EditRequested: ({ id }) => (state) =>
    state.list._tag === 'Loaded' && state.selection._tag === 'Idle'
      ? Opt.match(
        Arr.findFirst(
          state.list.items,
          (item): item is Data.TaggedEnum.Value<Product, 'Valid'> => item._tag === 'Valid' && item.id === id,
        ),
        {
          onNone: () => Tea.reject,
          onSome: ({ product }) => ({ state, events: [Event.EditRequested({ id, product })] }),
        },
      )
      : Tea.reject,

  SelectionCleared: () => (state) =>
    state.list._tag === 'Loaded' && state.selection._tag === 'Selecting'
      ? { state: { ...state, selection: Selection.Idle() } }
      : Tea.reject,

  // As Material's contextual action bar: the press clears the selection. It is held while the selection is being
  // deleted, so that the app is not left in the middle of a write.
  BackPressed: () => (state) =>
    !showsSelection(state)
      ? Tea.defect('BackPressed while no selection is shown: the button is observed only while one is')
      : state.selection._tag === 'Selecting'
      ? { state: { ...state, selection: Selection.Idle() } }
      : { state },

  // The products are kept from the list as it is now: the storage's change may reach the page before the
  // deletion's completion, and then they are gone from it.
  DeleteStarted: () => (state) =>
    state.list._tag === 'Loaded' && state.selection._tag === 'Selecting'
      ? {
        state: {
          ...state,
          selection: Selection.Deleting({
            ids: state.selection.ids,
            maybeProducts: productsOf(state.list.items, state.selection.ids),
          }),
        },
        commands: [Command.Delete({ ids: state.selection.ids })],
      }
      : Tea.reject,

  // A new deletion replaces the offer to undo the last one: that one is gone for good, its snackbar leaving
  // before the new one comes.
  Deleted: () => (state) =>
    state.selection._tag === 'Deleting'
      ? {
        state: { ...state, selection: Selection.Idle() },
        commands: [Command.Vibrate({ feedback: 'Confirm' })],
        tell: [
          tell(Notice.Deleted({
            count: PositiveInteger.makeUnsafe(HashSet.size(state.selection.ids)),
            maybeProducts: state.selection.maybeProducts,
          })),
        ],
      }
      : Tea.defect('Deleted while no deletion is in progress: only a completion leaves Deleting'),

  // Its snackbar replaces the one standing, and the offer to undo with it.
  DeleteFailed: () => (state) =>
    state.selection._tag === 'Deleting'
      ? {
        state: { ...state, selection: Selection.Selecting({ ids: state.selection.ids }) },
        commands: [Command.Vibrate({ feedback: 'Reject' })],
        tell: [tell(Notice.DeleteFailed())],
      }
      : Tea.defect('DeleteFailed while no deletion is in progress: only a completion leaves Deleting'),

  // Only a deletion of products alone can be undone; the offer is taken at once, its snackbar leaving with it, so a
  // second tap does nothing.
  UndoRequested: () => (state, children) =>
    Opt.match(undoable(children.Snackbar.output()), {
      onNone: () => Tea.reject,
      onSome: (products): Transition => ({
        state,
        commands: [Command.Restore({ products })],
        tell: [{ _tag: 'Snackbar', message: { _tag: 'Dismissed' } }],
      }),
    }),

  // Accepted in every state: the user may have done anything since asking, and the storage is as it was.
  RestoreFailed: () => (state) => ({
    state,
    commands: [Command.Vibrate({ feedback: 'Reject' })],
    tell: [tell(Notice.RestoreFailed())],
  }),
})

/** The selection keeps the products that still exist; a deletion in progress is left alone. */
export const listChanged = (state: State): Step => {
  const { list, selection } = state
  return list._tag === 'Loaded' && selection._tag !== 'Deleting'
    ? {
      state: {
        ...state,
        selection: selectionOf(HashSet.filter(selectedIds(selection), (id) => isListed(list.items, id))),
      },
    }
    : { state }
}

/**
 * How a row looks, and what it takes. A row leaving is no longer a product of the list: it is neither selected nor
 * opened.
 */
export const itemSelectionOf = (
  selection: Selection,
  id: Domain.ProductId,
  presence: Presence,
  isProduct: boolean,
): ItemSelection => {
  const isSelected = presence !== 'Leaving' && HashSet.has(selectedIds(selection), id)
  const toggle = (by: Gesture) =>
    selection._tag === 'Deleting' || presence === 'Leaving'
      ? Opt.none()
      : Opt.some(isSelected ? Message.ItemDeselected({ id, by }) : Message.ItemSelected({ id, by }))
  return {
    isSelected,
    maybeToggle: toggle('LongPress'),
    maybeTap: selection._tag === 'Selecting'
      ? toggle('Tap')
      : selection._tag === 'Idle' && isProduct && presence !== 'Leaving'
      ? Opt.some(Message.EditRequested({ id }))
      : Opt.none(),
  }
}

export const deletionOf = (selection: Selection): Deletion =>
  Match.valueTags(selection, {
    Idle: (): Deletion => ({ _tag: 'NothingSelected' }),
    Selecting: ({ ids }): Deletion => ({
      _tag: 'Possible',
      count: PositiveInteger.makeUnsafe(HashSet.size(ids)),
      deleteSelected: Message.DeleteStarted(),
      clearSelection: Message.SelectionCleared(),
    }),
    Deleting: (): Deletion => ({ _tag: 'InProgress' }),
  })

/** The snackbar standing, as its child draws it, with the way to undo where it applies. */
export const snackbarModel = (
  snackbar: SnackbarProgram.Model<Notice>,
  standing: Opt.Option<Notice>,
): SnackbarModel => {
  const maybeUndo = Opt.map(undoable(standing), () => Message.UndoRequested())
  return Opt.map(snackbar, ({ id, entrance, notice }) => ({
    id,
    entrance,
    notice: notice._tag === 'Deleted' ? { _tag: 'Deleted', count: notice.count, maybeUndo } : notice,
  }))
}
