// The stored products, as of the latest change of the storage, and the selection
// of some of them for deletion. The selection follows the list, so they are one program.
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

export type Selection = Data.TaggedEnum<{
  Idle: object
  Selecting: Readonly<{ ids: NonEmptyHashSet.NonEmptyHashSet<string> }>
  // Left only by its completion: with commands that cannot be cancelled, a
  // completion always belongs to the deletion in progress, so it needs no id.
  Deleting: Readonly<{ ids: NonEmptyHashSet.NonEmptyHashSet<string> }>
}>

const Selection = Data.taggedEnum<Selection>()

export type State = Readonly<{
  /** The current time, once the clock has ticked: expiration statuses derive from it. */
  maybeNow: Opt.Option<DateTime.Utc>
  list: Data.TaggedEnum<{
    Loading: object
    Failed: object
    Loaded: Readonly<{ items: ReadonlyArray<Product> }>
  }>
  selection: Selection
}>

export type Message = Data.TaggedEnum<{
  // From the view.
  ItemSelected: { id: string }
  ItemDeselected: { id: string }
  SelectionCleared: object
  DeleteStarted: object
  // From subscriptions.
  TimeChanged: { now: DateTime.Utc }
  ListChanged: { result: Result.Result<ReadonlyArray<StoredProduct>, ProductListReadError> }
  // From commands.
  DeleteCompleted: { succeeded: boolean }
}>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{
  Delete: { ids: NonEmptyHashSet.NonEmptyHashSet<string> }
  ShowToast: { text: string }
}>

const Command = Data.taggedEnum<Command>()

/** How a row looks, and what a long press on it does. */
export type ItemSelection = Readonly<{
  isSelected: boolean
  /** Selects the row, or deselects it; nothing while the selected products are being deleted. */
  maybeToggle: Opt.Option<Message>
}>

export type ProductStatus = Data.TaggedEnum<{
  Everlasting: object
  Stale: Readonly<{ expirationDate: DateTime.Utc }>
  /** Good through today, and no longer tomorrow. */
  ExpiringToday: Readonly<{ expirationDate: DateTime.Utc }>
  /** Good through today and `daysLeft - 1` more days: the expiration day counts. */
  Fresh: Readonly<{ expirationDate: DateTime.Utc; daysLeft: PositiveInteger.PositiveInteger }>
}>

export type ProductModel = Data.TaggedEnum<{
  /** Cannot be referenced, so nothing can be done with it. */
  Corrupt: Readonly<{ maybeName: Opt.Option<string> }>
  Invalid: Readonly<{ id: string; selection: ItemSelection; maybeName: Opt.Option<string> }>
  Valid: Readonly<{ id: string; selection: ItemSelection; name: string; status: ProductStatus }>
}>

export type Model = Data.TaggedEnum<{
  /** Until both the list and the time are known. */
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

// Expiration statuses derive from the current time: it is refreshed often
// enough for days-long expirations.
const clock = Channel.forever(
  Channel.fromEffect(DateTime.now).pipe(
    Channel.map((now) => Message.TimeChanged({ now })),
    Channel.concatWith(() => Channel.fromEffectDrain(Effect.sleep('30 seconds'))),
  ),
)

const changes = Channel.unwrap(
  Effect.map(
    Effect.service(ProductList),
    ({ changes }) => Channel.map(changes, (result) => Message.ListChanged({ result })),
  ),
)

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
  },
  Effect.match({
    onSuccess: () => Message.DeleteCompleted({ succeeded: true }),
    onFailure: () => Message.DeleteCompleted({ succeeded: false }),
  }),
  Effect.asSome,
  Effect.withLogSpan('DeleteProducts'),
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

type Deletion = Data.TaggedEnum.Value<Model, 'Available'>['deletion']

const statusAt = (now: DateTime.Utc, product: Domain.Product): ProductStatus =>
  Opt.match(Domain.maybeExpiration(product), {
    onNone: () => ({ _tag: 'Everlasting' }),
    onSome: (expiration) => {
      const { expirationDate } = expiration
      const status = Domain.expirationStatus(now)(expiration)
      if (status.hasExpired) {
        return { _tag: 'Stale', expirationDate }
      }
      // A day begun counts: some time is left, so at least one day is.
      const daysLeft = Math.ceil(Duration.toDays(status.timeLeft))
      return daysLeft === 1
        ? { _tag: 'ExpiringToday', expirationDate }
        : { _tag: 'Fresh', expirationDate, daysLeft: PositiveInteger.makeUnsafe(daysLeft) }
    },
  })

export type Deps = DeleteProducts.DeleteProducts | ProductList | Notifications

export const program: Tea.Program<{
  state: State
  model: Model
  message: Message
  command: Command
  services: Deps
}> = {
  init: {
    state: { maybeNow: Opt.none(), list: { _tag: 'Loading' }, selection: Selection.Idle() },
  },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command>>()({
    ListChanged: ({ result }) => (state) =>
      Result.match(result, {
        onFailure: () => ({ state: { ...state, list: { _tag: 'Failed' } } }),
        onSuccess: (stored) => {
          const items = Arr.map(stored, validate)
          return {
            state: {
              ...state,
              list: { _tag: 'Loaded', items },
              // The selection keeps the products that still exist; a deletion in progress is left alone.
              selection: state.selection._tag === 'Deleting'
                ? state.selection
                : selectionOf(HashSet.intersection(selectedIds(state.selection), idsOf(items))),
            },
          }
        },
      }),

    TimeChanged: ({ now }) => (state) => ({ state: { ...state, maybeNow: Opt.some(now) } }),

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
      state.selection._tag === 'Selecting' ? { state: { ...state, selection: Selection.Idle() } } : Tea.reject,

    DeleteStarted: () => (state) =>
      state.list._tag === 'Loaded' && state.selection._tag === 'Selecting'
        ? {
          state: { ...state, selection: Selection.Deleting({ ids: state.selection.ids }) },
          commands: [Command.Delete({ ids: state.selection.ids })],
        }
        : Tea.reject,

    DeleteCompleted: ({ succeeded }) => (state) => {
      if (state.selection._tag !== 'Deleting') {
        return defect('DeleteCompleted while no deletion is in progress: only a completion leaves Deleting')
      }
      return succeeded
        ? { state: { ...state, selection: Selection.Idle() } }
        : {
          state: { ...state, selection: Selection.Selecting({ ids: state.selection.ids }) },
          commands: [Command.ShowToast({ text: 'Could not delete the products' })],
        }
    },
  }),

  runCommand: Match.typeTags<Command>()({
    Delete: deleteProducts,
    ShowToast: showToast,
  }),

  subscriptions: () => HashMap.make(['clock', clock], ['changes', changes]),

  makeModel: (state) => {
    if (state.list._tag === 'Loading' || Opt.isNone(state.maybeNow)) {
      return { _tag: 'Initial' }
    }
    const now = state.maybeNow.value
    if (state.list._tag === 'Failed') {
      return { _tag: 'Error' }
    }
    const items = state.list.items
    if (!Arr.isReadonlyArrayNonEmpty(items)) {
      return { _tag: 'Empty' }
    }
    const { selection } = state
    const itemSelectionOf = (id: string): ItemSelection => {
      const isSelected = HashSet.has(selectedIds(selection), id)
      return {
        isSelected,
        maybeToggle: selection._tag === 'Deleting'
          ? Opt.none()
          : Opt.some(isSelected ? Message.ItemDeselected({ id }) : Message.ItemSelected({ id })),
      }
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
      products: Arr.map(items, (product) =>
        Match.valueTags(product, {
          Corrupt: ({ maybeName }): ProductModel => ({ _tag: 'Corrupt', maybeName }),
          Invalid: ({ id, maybeName }): ProductModel => ({
            _tag: 'Invalid',
            id,
            selection: itemSelectionOf(id),
            maybeName,
          }),
          Valid: ({ id, product }): ProductModel => ({
            _tag: 'Valid',
            id,
            selection: itemSelectionOf(id),
            name: product.name,
            status: statusAt(now, product),
          }),
        })),
    }
  },
}
