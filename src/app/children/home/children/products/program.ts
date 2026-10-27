// The stored products, as of the latest change of the storage, the selection of some of them for deletion, and
// the last deletion, which the user may undo for a few seconds. The selection follows the list, so they are one
// program.
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as Domain from '#domain/product.ts'
import { Notifications } from '#infrastructure/notifications/notifications.ts'
import * as NonEmptyHashSet from '#libs/collections/non-empty-hash-set.ts'
import { defect } from '#libs/defect/defect.ts'
import * as PositiveInteger from '#libs/numbers/positive-integer.ts'
import type * as UnitInterval from '#libs/numbers/unit-interval.ts'
import * as DeleteProducts from './services/delete-products/delete-products.ts'
import { ProductList, type ProductListReadError, type StoredProduct } from './services/product-list/product-list.ts'

export type Product = Data.TaggedEnum<{
  /** Stored data so broken it cannot even be referenced. */
  Corrupt: Readonly<{ maybeName: Opt.Option<string> }>
  /** Stored with an id, but not a valid product: it can still be selected and deleted. */
  Invalid: Readonly<{ id: string; maybeName: Opt.Option<string> }>
  Valid: Readonly<{ id: string; product: Domain.Product }>
}>

const Product = Data.taggedEnum<Product>()

/**
 * The products being deleted, when every one of them is a product: only then can the deletion be undone, by
 * storing them again. Stored data that is not a product is gone for good.
 */
type Restorable = Opt.Option<Arr.NonEmptyReadonlyArray<Domain.Product>>

export type Selection = Data.TaggedEnum<{
  Idle: object
  Selecting: Readonly<{ ids: NonEmptyHashSet.NonEmptyHashSet<string> }>
  // Left only by its completion: with commands that cannot be cancelled, a
  // completion always belongs to the deletion in progress, so it needs no id.
  Deleting: Readonly<{ ids: NonEmptyHashSet.NonEmptyHashSet<string>; maybeProducts: Restorable }>
}>

const Selection = Data.taggedEnum<Selection>()

/** The last deletion, for a few seconds after it: a snackbar says so, and offers to undo it. */
export type LastDeletion = Data.TaggedEnum<{
  None: object
  Recent: Readonly<{ at: DateTime.Utc; count: PositiveInteger.PositiveInteger; maybeProducts: Restorable }>
}>

const LastDeletion = Data.taggedEnum<LastDeletion>()

export type State = Readonly<{
  /**
   * The current time, which the statuses of the products that expire derive from. The clock runs only while a
   * listed product expires: `None` until it has ticked, and again once no product needs it.
   */
  maybeNow: Opt.Option<DateTime.Utc>
  list: Data.TaggedEnum<{
    Loading: object
    Failed: object
    Loaded: Readonly<{ items: ReadonlyArray<Product> }>
  }>
  selection: Selection
  lastDeletion: LastDeletion
}>

export type Message = Data.TaggedEnum<{
  // From the view.
  ItemSelected: { id: string }
  ItemDeselected: { id: string }
  SelectionCleared: object
  DeleteStarted: object
  /** The snackbar's action: the products deleted last are stored again. */
  UndoRequested: object
  // From subscriptions.
  TimeChanged: { now: DateTime.Utc }
  ListChanged: { result: Result.Result<ReadonlyArray<StoredProduct>, ProductListReadError> }
  /** The last deletion is a few seconds old: the offer to undo it is withdrawn. */
  UndoExpired: object
  // From commands.
  Deleted: { at: DateTime.Utc }
  DeleteFailed: object
  RestoreFailed: object
}>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{
  Delete: { ids: NonEmptyHashSet.NonEmptyHashSet<string> }
  Restore: { products: Arr.NonEmptyReadonlyArray<Domain.Product> }
  ShowToast: { text: string }
}>

const Command = Data.taggedEnum<Command>()

/** How a row looks, and what a long press on it does. */
export type ItemSelection = Readonly<{
  isSelected: boolean
  /** Selects the row, or deselects it; nothing while the selected products are being deleted. */
  maybeToggle: Opt.Option<Message>
}>

/** How much of a product's life is left, from its creation to the end of its expiration day. */
type Freshness = UnitInterval.UnitInterval

export type ProductStatus = Data.TaggedEnum<{
  Everlasting: object
  /** Expired `daysAgo` days ago, two at least: yesterday has a case of its own. */
  Stale: Readonly<{ expirationDate: DateTime.Utc; daysAgo: PositiveInteger.PositiveInteger }>
  /** Good through yesterday, and no longer today. */
  ExpiredYesterday: Readonly<{ expirationDate: DateTime.Utc }>
  /** Good through today, and no longer tomorrow. */
  ExpiringToday: Readonly<{ expirationDate: DateTime.Utc; freshness: Freshness }>
  /** Good through tomorrow. */
  ExpiringTomorrow: Readonly<{ expirationDate: DateTime.Utc; freshness: Freshness }>
  /** Good through the day `inDays` days ahead, two at least: today and tomorrow have cases of their own. */
  Fresh: Readonly<{ expirationDate: DateTime.Utc; inDays: PositiveInteger.PositiveInteger; freshness: Freshness }>
}>

export type ProductModel = Data.TaggedEnum<{
  /** Cannot be referenced, so nothing can be done with it. */
  Corrupt: Readonly<{ maybeName: Opt.Option<string> }>
  Invalid: Readonly<{ id: string; selection: ItemSelection; maybeName: Opt.Option<string> }>
  Valid: Readonly<{ id: string; selection: ItemSelection; name: string; status: ProductStatus }>
}>

export type ListModel = Data.TaggedEnum<{
  /** Until the list is known, and the time with it when a product expires. */
  Initial: object
  Error: object
  Empty: object
  Available: Readonly<{
    deletion: Data.TaggedEnum<{
      NothingSelected: object
      Possible: {
        count: PositiveInteger.PositiveInteger
        deleteSelected: Message
        clearSelection: Message
      }
      InProgress: object
    }>
    total: PositiveInteger.PositiveInteger
    products: Arr.NonEmptyReadonlyArray<ProductModel>
  }>
}>

export type Model = Readonly<{
  list: ListModel
  /** The snackbar of the last deletion: how many products went and, while they can come back, the way to undo it. */
  lastDeletion: Data.TaggedEnum<{
    None: object
    Deleted: Readonly<{ count: PositiveInteger.PositiveInteger; maybeUndo: Opt.Option<Message> }>
  }>
}>

// Material's snackbar with an action stays up to 10 seconds: long enough to read it and reach for "Undo".
const UNDO_DURATION = Duration.seconds(5)

// Products that still have an id can be selected and deleted, even when invalid;
// the ones without an id cannot be referenced at all.
const validate = (stored: StoredProduct): Product =>
  Opt.match(stored.maybeId, {
    onNone: () => Product.Corrupt({ maybeName: stored.maybeName }),
    onSome: (id) =>
      Opt.match(Domain.fromSnapshot(stored), {
        onNone: () => Product.Invalid({ id, maybeName: stored.maybeName }),
        onSome: (product) => Product.Valid({ id, product }),
      }),
  })

const expires = (item: Product) => item._tag === 'Valid' && Opt.isSome(item.product.maybeExpirationDate)

/** Whether the time is needed: while a listed product expires. */
const needsClock = (list: State['list']) => list._tag === 'Loaded' && Arr.some(list.items, expires)

const idsOf = (items: ReadonlyArray<Product>) =>
  HashSet.fromIterable(Arr.flatMap(items, (product) => (product._tag === 'Corrupt' ? [] : [product.id])))

/** The ids that can be selected: those of the loaded products, while nothing is being deleted. */
const selectableIds = (state: State): HashSet.HashSet<string> =>
  state.list._tag === 'Loaded' && state.selection._tag !== 'Deleting' ? idsOf(state.list.items) : HashSet.empty()

/** The selection, as ids: empty when there is none. */
const selectedIds = (selection: Selection): HashSet.HashSet<string> =>
  selection._tag === 'Idle' ? HashSet.empty() : selection.ids

/** The selection of exactly those ids: none when there are none. */
const selectionOf = (ids: HashSet.HashSet<string>): Selection =>
  Opt.match(NonEmptyHashSet.make(ids), {
    onNone: () => Selection.Idle(),
    onSome: (ids) => Selection.Selecting({ ids }),
  })

/** The products the ids name, in the list's order, when every id names one. */
export const productsOf = (items: ReadonlyArray<Product>, ids: HashSet.HashSet<string>): Restorable => {
  const isProduct = (id: string) => items.some((item) => item._tag === 'Valid' && item.id === id)
  const products = Arr.flatMap(
    items,
    (item) => item._tag === 'Valid' && HashSet.has(ids, item.id) ? [item.product] : [],
  )
  return HashSet.every(ids, isProduct) && Arr.isReadonlyArrayNonEmpty(products) ? Opt.some(products) : Opt.none()
}

// Expiration statuses derive from the current time: it is refreshed often
// enough for days-long expirations.
const clock: Tea.Subscription<Message, Deps> = Channel.forever(
  Channel.fromEffect(DateTime.now).pipe(
    Channel.map((now) => Message.TimeChanged({ now })),
    Channel.concatWith(() => Channel.fromEffectDrain(Effect.sleep('30 seconds'))),
  ),
)

const changes: Tea.Subscription<Message, Deps> = Channel.unwrap(
  Effect.map(
    Effect.service(ProductList),
    ({ changes }) => Channel.map(changes, (result) => Message.ListChanged({ result })),
  ),
)

// The offer stands for a while from the deletion, not from when the page is shown: hidden under another page
// past its end, it is withdrawn as soon as the page is back.
const expireUndo = Effect.fn('ExpireUndo')(function*(deletedAt: DateTime.Utc) {
  const now = yield* DateTime.now
  yield* Effect.sleep(Duration.max(Duration.zero, Duration.subtract(UNDO_DURATION, DateTime.distance(deletedAt, now))))
  return Message.UndoExpired()
})

/** Ends, with its message, once the last deletion is old enough. */
const undoTimer = (deletedAt: DateTime.Utc): Tea.Subscription<Message, Deps> =>
  Channel.fromEffectDone(expireUndo(deletedAt))

/** A subscription's key: the timer of the offer to undo is keyed by the deletion it times. */
type Key = string | readonly ['undo', DateTime.Utc]

const always: HashMap.HashMap<Key, Tea.Subscription<Message, Deps>> = HashMap.make(['changes', changes])

const deleteProducts = Effect.fn('DeleteProducts')(
  function*({ ids }: Readonly<{ ids: NonEmptyHashSet.NonEmptyHashSet<string> }>) {
    const { deleteById } = yield* DeleteProducts.DeleteProducts
    yield* Effect.logDebug('Deleting products', { count: HashSet.size(ids) })
    yield* pipe(
      ids,
      HashSet.map((id) => DeleteProducts.DeleteProductById({ id })),
      Effect.forEach(Effect.request(deleteById), { concurrency: 'unbounded', discard: true }),
      // The storage logs the cause.
      Effect.tapError(() => Effect.logWarning('Could not delete the products')),
    )
    yield* Effect.logInfo('Deleted products', { count: HashSet.size(ids) })
    return yield* DateTime.now
  },
  Effect.match({
    onSuccess: (at) => Message.Deleted({ at }),
    onFailure: () => Message.DeleteFailed(),
  }),
  Effect.asSome,
  Effect.withLogSpan('DeleteProducts'),
)

const restoreProducts = Effect.fn('RestoreProducts')(
  function*({ products }: Readonly<{ products: Arr.NonEmptyReadonlyArray<Domain.Product> }>) {
    const { restore } = yield* DeleteProducts.DeleteProducts
    yield* Effect.logDebug('Putting products back', { count: products.length })
    yield* pipe(
      products,
      Arr.map((product) => DeleteProducts.RestoreProduct({ snapshot: Domain.toSnapshot(product) })),
      Effect.forEach(Effect.request(restore), { concurrency: 'unbounded', discard: true }),
      // The storage logs the cause.
      Effect.tapError(() => Effect.logWarning('Could not put the products back')),
    )
    yield* Effect.logInfo('Put products back', { count: products.length })
  },
  Effect.match({
    onSuccess: () => Opt.none(),
    onFailure: () => Opt.some(Message.RestoreFailed()),
  }),
  Effect.withLogSpan('RestoreProducts'),
)

const showToast = Effect.fn('ShowToast')(
  function*({ text }: Readonly<{ text: string }>) {
    const { showToast } = yield* Notifications
    yield* showToast(text).pipe(
      Effect.catchTag('NotificationError', (error) => Effect.logWarning('Could not show toast', error.cause)),
    )
    return Opt.none()
  },
  Effect.withLogSpan('ShowToast'),
)

type Deletion = Data.TaggedEnum.Value<ListModel, 'Available'>['deletion']

const expirationStatusAt = (now: DateTime.Utc, expiration: Domain.Expiration): ProductStatus => {
  const { expirationDate } = expiration
  const status = Domain.expirationStatus(now)(expiration)
  if (status.hasExpired) {
    const { daysSinceExpiration } = status
    return daysSinceExpiration === 1
      ? { _tag: 'ExpiredYesterday', expirationDate }
      : { _tag: 'Stale', expirationDate, daysAgo: PositiveInteger.makeUnsafe(daysSinceExpiration) }
  }
  const { freshness, daysUntilExpiration } = status
  switch (daysUntilExpiration) {
    case 0:
      return { _tag: 'ExpiringToday', expirationDate, freshness }
    case 1:
      return { _tag: 'ExpiringTomorrow', expirationDate, freshness }
    default:
      return { _tag: 'Fresh', expirationDate, inDays: PositiveInteger.makeUnsafe(daysUntilExpiration), freshness }
  }
}

/** The status of a product: `None` for one that expires while the clock has not ticked yet. */
const maybeStatusAt = (maybeNow: Opt.Option<DateTime.Utc>, product: Domain.Product): Opt.Option<ProductStatus> =>
  Opt.match(Domain.maybeExpiration(product), {
    onNone: () => Opt.some({ _tag: 'Everlasting' }),
    onSome: (expiration) => Opt.map(maybeNow, (now) => expirationStatusAt(now, expiration)),
  })

const listModel = (state: State): ListModel => {
  if (state.list._tag === 'Loading') {
    return { _tag: 'Initial' }
  }
  if (state.list._tag === 'Failed') {
    return { _tag: 'Error' }
  }
  const items = state.list.items
  if (!Arr.isReadonlyArrayNonEmpty(items)) {
    return { _tag: 'Empty' }
  }
  const { selection, maybeNow } = state
  const itemSelectionOf = (id: string): ItemSelection => {
    const isSelected = HashSet.has(selectedIds(selection), id)
    return {
      isSelected,
      maybeToggle: selection._tag === 'Deleting'
        ? Opt.none()
        : Opt.some(isSelected ? Message.ItemDeselected({ id }) : Message.ItemSelected({ id })),
    }
  }
  // Until the clock has ticked, the products that expire have no status: the list waits for it.
  const maybeProducts = Opt.all(Arr.map(items, (product) =>
    Match.valueTags(product, {
      Corrupt: ({ maybeName }): Opt.Option<ProductModel> => Opt.some({ _tag: 'Corrupt', maybeName }),
      Invalid: ({ id, maybeName }): Opt.Option<ProductModel> =>
        Opt.some({ _tag: 'Invalid', id, selection: itemSelectionOf(id), maybeName }),
      Valid: ({ id, product }): Opt.Option<ProductModel> =>
        Opt.map(maybeStatusAt(maybeNow, product), (status) => ({
          _tag: 'Valid',
          id,
          selection: itemSelectionOf(id),
          name: product.name,
          status,
        })),
    })))
  if (Opt.isNone(maybeProducts)) {
    return { _tag: 'Initial' }
  }
  return {
    _tag: 'Available',
    deletion: Match.valueTags(selection, {
      Idle: (): Deletion => ({ _tag: 'NothingSelected' }),
      Selecting: ({ ids }): Deletion => ({
        _tag: 'Possible',
        count: PositiveInteger.makeUnsafe(HashSet.size(ids)),
        deleteSelected: Message.DeleteStarted(),
        clearSelection: Message.SelectionCleared(),
      }),
      Deleting: (): Deletion => ({ _tag: 'InProgress' }),
    }),
    total: PositiveInteger.makeUnsafe(items.length),
    products: maybeProducts.value,
  }
}

export type Deps = DeleteProducts.DeleteProducts | ProductList | Notifications

export const program: Tea.Program<{
  state: State
  model: Model
  message: Message
  command: Command
  services: Deps
}> = {
  init: {
    state: {
      maybeNow: Opt.none(),
      list: { _tag: 'Loading' },
      selection: Selection.Idle(),
      lastDeletion: LastDeletion.None(),
    },
  },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command>>()({
    ListChanged: ({ result }) => (state) => {
      const list: State['list'] = Result.match(result, {
        onFailure: () => ({ _tag: 'Failed' }),
        onSuccess: (stored) => ({ _tag: 'Loaded', items: Arr.map(stored, validate) }),
      })
      return {
        state: {
          ...state,
          list,
          // The clock stops with the last product that expires: the time it told goes with it.
          maybeNow: needsClock(list) ? state.maybeNow : Opt.none(),
          // The selection keeps the products that still exist; a deletion in progress is left alone.
          selection: list._tag === 'Failed' || state.selection._tag === 'Deleting'
            ? state.selection
            : selectionOf(HashSet.intersection(selectedIds(state.selection), idsOf(list.items))),
        },
      }
    },

    TimeChanged: ({ now }) => (state) =>
      needsClock(state.list)
        ? { state: { ...state, maybeNow: Opt.some(now) } }
        : defect('TimeChanged while no listed product expires: the clock runs only while one does'),

    // Only a product of the list can be selected: a tap on a row the storage has meanwhile removed does nothing.
    ItemSelected: ({ id }) => (state) =>
      HashSet.has(selectableIds(state), id) && !HashSet.has(selectedIds(state.selection), id)
        ? { state: { ...state, selection: selectionOf(HashSet.add(selectedIds(state.selection), id)) } }
        : Tea.reject,

    ItemDeselected: ({ id }) => (state) =>
      state.list._tag === 'Loaded' && state.selection._tag === 'Selecting' && HashSet.has(state.selection.ids, id)
        ? { state: { ...state, selection: selectionOf(HashSet.remove(state.selection.ids, id)) } }
        : Tea.reject,

    SelectionCleared: () => (state) =>
      state.list._tag === 'Loaded' && state.selection._tag === 'Selecting'
        ? { state: { ...state, selection: Selection.Idle() } }
        : Tea.reject,

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

    // A new deletion replaces the offer to undo the last one: that one is gone for good.
    Deleted: ({ at }) => (state) =>
      state.selection._tag === 'Deleting'
        ? {
          state: {
            ...state,
            selection: Selection.Idle(),
            lastDeletion: LastDeletion.Recent({
              at,
              count: PositiveInteger.makeUnsafe(HashSet.size(state.selection.ids)),
              maybeProducts: state.selection.maybeProducts,
            }),
          },
        }
        : defect('Deleted while no deletion is in progress: only a completion leaves Deleting'),

    DeleteFailed: () => (state) =>
      state.selection._tag === 'Deleting'
        ? {
          state: { ...state, selection: Selection.Selecting({ ids: state.selection.ids }) },
          commands: [Command.ShowToast({ text: 'Couldn\'t delete the products' })],
        }
        : defect('DeleteFailed while no deletion is in progress: only a completion leaves Deleting'),

    // Only a deletion of products alone can be undone; the offer is taken at once, so a second tap does nothing.
    UndoRequested: () => (state) =>
      state.lastDeletion._tag === 'Recent' && Opt.isSome(state.lastDeletion.maybeProducts)
        ? {
          state: { ...state, lastDeletion: LastDeletion.None() },
          commands: [Command.Restore({ products: state.lastDeletion.maybeProducts.value })],
        }
        : Tea.reject,

    UndoExpired: () => (state) =>
      state.lastDeletion._tag === 'Recent'
        ? { state: { ...state, lastDeletion: LastDeletion.None() } }
        : defect('UndoExpired while no deletion is recent: the timer runs only while one is'),

    // Accepted in every state: the user may have done anything since asking, and the storage is as it was.
    RestoreFailed: () => (state) => ({
      state,
      commands: [Command.ShowToast({ text: 'Couldn\'t put the products back' })],
    }),
  }),

  runCommand: Match.typeTags<Command>()({
    Delete: deleteProducts,
    Restore: restoreProducts,
    ShowToast: showToast,
  }),

  subscriptions: (state) => {
    const withClock = needsClock(state.list) ? HashMap.set(always, 'clock', clock) : always
    return state.lastDeletion._tag === 'Recent'
      ? HashMap.set(withClock, ['undo', state.lastDeletion.at] as const, undoTimer(state.lastDeletion.at))
      : withClock
  },

  makeModel: (state) => ({
    list: listModel(state),
    lastDeletion: Match.valueTags(state.lastDeletion, {
      None: (): Model['lastDeletion'] => ({ _tag: 'None' }),
      Recent: ({ count, maybeProducts }): Model['lastDeletion'] => ({
        _tag: 'Deleted',
        count,
        maybeUndo: Opt.map(maybeProducts, () => Message.UndoRequested()),
      }),
    }),
  }),
}
