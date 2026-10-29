// The stored products, as of the latest change of the storage, the selection of some of them for deletion, and
// the snackbar, which tells of the last deletion, offering to undo it for a few seconds, or of a failure. The
// selection follows the list, so they are one program.
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
import { type Feedback, Haptics } from '#infrastructure/haptics/haptics.ts'
import * as NonEmptyHashSet from '#libs/collections/non-empty-hash-set.ts'
import * as PositiveInteger from '#libs/numbers/positive-integer.ts'
import type * as UnitInterval from '#libs/numbers/unit-interval.ts'
import { after, every } from '#libs/timers/timers.ts'
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
 * A row the storage no longer lists, kept after the row it followed (or first) while it closes its place: the rows
 * under it rise, rather than jump to their new place.
 */
export type Departure = Readonly<{ item: Exclude<Product, { _tag: 'Corrupt' }>; maybeAfter: Opt.Option<string> }>

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

/** Material shows one snackbar at a time: one that comes after another waits for it to leave. */
export type Entrance = 'Alone' | 'AfterAnother'

/** What a snackbar tells. */
export type Notice = Data.TaggedEnum<{
  /** The last deletion, which the snackbar offers to undo while its products can come back. */
  Deleted: Readonly<{ count: PositiveInteger.PositiveInteger; maybeProducts: Restorable }>
  DeleteFailed: object
  RestoreFailed: object
}>

const Notice = Data.taggedEnum<Notice>()

/** The snackbar, for a few seconds from `at`, when what it tells happened. */
export type Snackbar = Data.TaggedEnum<{
  None: object
  Shown: Readonly<{ at: DateTime.Utc; notice: Notice; entrance: Entrance }>
}>

const Snackbar = Data.taggedEnum<Snackbar>()

export type State = Readonly<{
  /**
   * The current time, which the statuses of the products that expire derive from. The clock runs only while a
   * product shown, listed or leaving, expires: `None` until it has ticked, and again once no product needs it.
   */
  maybeNow: Opt.Option<DateTime.Utc>
  list: Data.TaggedEnum<{
    Loading: object
    Failed: object
    Loaded: Readonly<{
      items: ReadonlyArray<Product>
      /** The ids a change brought into a list already shown, until they have arrived. A first list appears whole. */
      arrivals: HashSet.HashSet<string>
      /** The rows that changes took out of the list, in the order they were shown, until they have left. */
      departures: ReadonlyArray<Departure>
    }>
  }>
  selection: Selection
  snackbar: Snackbar
}>

export type Message = Data.TaggedEnum<{
  // From the view.
  /** A long press says so with a vibration; a tap does not. */
  ItemSelected: { id: string; by: Gesture }
  ItemDeselected: { id: string; by: Gesture }
  /** A tap on a product while nothing is selected: opens it to be edited. */
  EditRequested: { id: string }
  SelectionCleared: object
  DeleteStarted: object
  /** The snackbar's action: the products deleted last are stored again. */
  UndoRequested: object
  // From subscriptions.
  TimeChanged: { now: DateTime.Utc }
  ListChanged: { result: Result.Result<ReadonlyArray<StoredProduct>, ProductListReadError> }
  /** The snackbar has stood its time: it leaves, and the offer to undo with it. */
  SnackbarExpired: object
  /** The arriving rows have opened their place, and the leaving ones closed theirs. */
  RowsSettled: object
  // From commands.
  Deleted: { at: DateTime.Utc }
  DeleteFailed: { at: DateTime.Utc }
  RestoreFailed: { at: DateTime.Utc }
}>

const Message = Data.taggedEnum<Message>()

/** How a row was selected or deselected. */
export type Gesture = 'Tap' | 'LongPress'

export type Command = Data.TaggedEnum<{
  Delete: { ids: NonEmptyHashSet.NonEmptyHashSet<string> }
  Restore: { products: Arr.NonEmptyReadonlyArray<Domain.Product> }
  Vibrate: { feedback: Feedback }
}>

const Command = Data.taggedEnum<Command>()

/** Only a long press vibrates, as Android's do: a tap is feedback enough. */
const feedbackOf = (by: Gesture): ReadonlyArray<Command> =>
  by === 'LongPress' ? [Command.Vibrate({ feedback: 'LongPress' })] : []

export type Event = Data.TaggedEnum<{
  /** The product to edit, as the row shows it. */
  EditRequested: { id: string; product: Domain.Product }
}>

const Event = Data.taggedEnum<Event>()

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

/** Whether a row opens its place, has it, or closes it. */
export type Presence = 'Arriving' | 'Listed' | 'Leaving'

export type ProductModel = Data.TaggedEnum<{
  /** Cannot be referenced, so nothing can be done with it. */
  Corrupt: Readonly<{ maybeName: Opt.Option<string> }>
  Invalid: Readonly<{ id: string; selection: ItemSelection; presence: Presence; maybeName: Opt.Option<string> }>
  Valid: Readonly<{ id: string; selection: ItemSelection; presence: Presence; name: string; status: ProductStatus }>
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
    /** The products listed, in order, with the ones leaving where they were. */
    products: Arr.NonEmptyReadonlyArray<ProductModel>
  }>
}>

export type Model = Readonly<{
  list: ListModel
  /** `at` tells one snackbar from the next. `maybeUndo` only while the products deleted can come back. */
  snackbar: Data.TaggedEnum<{
    None: object
    Shown: Readonly<{
      at: DateTime.Utc
      entrance: Entrance
      notice: Data.TaggedEnum<{
        Deleted: Readonly<{ count: PositiveInteger.PositiveInteger; maybeUndo: Opt.Option<Message> }>
        DeleteFailed: object
        RestoreFailed: object
      }>
    }>
  }>
}>

// Material's long duration, for a snackbar with an action: long enough to read it and reach for "Undo".
const UNDO_DURATION = Duration.seconds(10)

// Material's snackbar without an action: long enough to read it.
const NOTICE_DURATION = Duration.seconds(4)

const durationOf = (notice: Notice) =>
  notice._tag === 'Deleted' && Opt.isSome(notice.maybeProducts) ? UNDO_DURATION : NOTICE_DURATION

/** The snackbar of a notice from `at`, after the one standing, if any. */
const snackbarOf = (state: State, at: DateTime.Utc, notice: Notice): Snackbar =>
  Snackbar.Shown({ at, notice, entrance: state.snackbar._tag === 'Shown' ? 'AfterAnother' : 'Alone' })

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

/** Whether the time is needed: while a product shown expires, listed or leaving. */
const needsClock = (list: State['list']) =>
  list._tag === 'Loaded'
  && (Arr.some(list.items, expires) || Arr.some(list.departures, (departure) => expires(departure.item)))

const idsOf = (items: ReadonlyArray<Product>) =>
  HashSet.fromIterable(Arr.flatMap(items, (product) => (product._tag === 'Corrupt' ? [] : [product.id])))

type Loaded = Data.TaggedEnum.Value<State['list'], 'Loaded'>

type Row = Readonly<{ item: Product; presence: Presence }>

/** The listed rows, each leaving one after the row it followed and after the rows that left from there before it. */
const rowsOf = ({ items, arrivals, departures }: Loaded): ReadonlyArray<Row> =>
  Arr.reduce(
    departures,
    Arr.map(items, (item): Row => ({
      item,
      presence: item._tag !== 'Corrupt' && HashSet.has(arrivals, item.id) ? 'Arriving' : 'Listed',
    })),
    (rows, { item, maybeAfter }) => {
      const anchor = Opt.match(maybeAfter, {
        onNone: () => 0,
        onSome: (id) =>
          pipe(
            Arr.findFirstIndex(rows, (row) => row.item._tag !== 'Corrupt' && row.item.id === id),
            Opt.match({ onNone: () => 0, onSome: (index) => index + 1 }),
          ),
      })
      const index = pipe(
        Arr.findFirstIndex(rows.slice(anchor), (row) => row.presence !== 'Leaving'),
        Opt.match({ onNone: () => rows.length, onSome: (offset) => anchor + offset }),
      )
      return [...rows.slice(0, index), { item, presence: 'Leaving' }, ...rows.slice(index)]
    },
  )

/** The rows shown whose ids are no longer listed, each after the id it followed. */
const departuresFrom = (rows: ReadonlyArray<Row>, ids: HashSet.HashSet<string>): ReadonlyArray<Departure> =>
  Arr.reduce(
    rows,
    { maybeAfter: Opt.none<string>(), departures: Arr.empty<Departure>() },
    ({ maybeAfter, departures }, { item }) =>
      item._tag === 'Corrupt'
        ? { maybeAfter, departures }
        : {
          maybeAfter: Opt.some(item.id),
          departures: HashSet.has(ids, item.id) ? departures : [...departures, { item, maybeAfter }],
        },
  ).departures

/** Whether a row opens or closes its place. */
const isSettling = (list: State['list']) =>
  list._tag === 'Loaded' && (HashSet.size(list.arrivals) > 0 || Arr.isReadonlyArrayNonEmpty(list.departures))

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
const clock: Tea.Subscription<Message, Deps> = every('30 seconds', (now) => Message.TimeChanged({ now }))

const changes: Tea.Subscription<Message, Deps> = Channel.unwrap(
  Effect.map(
    Effect.service(ProductList),
    ({ changes }) => Channel.map(changes, (result) => Message.ListChanged({ result })),
  ),
)

// A snackbar stands for a while from what it tells, not from when the page is shown: hidden under another page
// past its end, it leaves as soon as the page is back.
const expireSnackbar = Effect.fn('ExpireSnackbar')(function*(at: DateTime.Utc, duration: Duration.Duration) {
  const now = yield* DateTime.now
  yield* Effect.sleep(Duration.max(Duration.zero, Duration.subtract(duration, DateTime.distance(at, now))))
  return Message.SnackbarExpired()
})

/** Ends, with its message, once the snackbar has stood its time. */
const snackbarTimer = (at: DateTime.Utc, notice: Notice): Tea.Subscription<Message, Deps> =>
  Channel.fromEffectDone(expireSnackbar(at, durationOf(notice)))

// Longer than a row's entrance (Material's medium-4, and the frame it waits for) and its exit (short-4): a row is
// drawn as any other, or gone, only once it has opened or closed its place. Hidden under another page, the timer
// waits for the page to be back.
const SETTLING_DURATION = Duration.millis(500)

/** Ends once the rows have been shown arriving and leaving. */
const settlingTimer: Tea.Subscription<Message, Deps> = after(SETTLING_DURATION, Message.RowsSettled())

/**
 * The snackbar's timer is keyed by its notice, the settling timer by the ids arriving and leaving: a new one starts
 * it anew.
 */
type Key =
  | string
  | readonly ['snackbar', DateTime.Utc, Notice['_tag']]
  | readonly ['settling', HashSet.HashSet<string>, HashSet.HashSet<string>]

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
    return Message.Deleted({ at: yield* DateTime.now })
  },
  Effect.catch(() => Effect.map(DateTime.now, (at) => Message.DeleteFailed({ at }))),
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
    return Opt.none()
  },
  Effect.catch(() => Effect.map(DateTime.now, (at) => Opt.some(Message.RestoreFailed({ at })))),
  Effect.withLogSpan('RestoreProducts'),
)

const vibrate = Effect.fn('Vibrate')(
  function*({ feedback }: Readonly<{ feedback: Feedback }>) {
    const { perform } = yield* Haptics
    yield* perform(feedback).pipe(
      Effect.catchTag('HapticsError', (error) => Effect.logWarning('Could not vibrate', error.cause)),
    )
    return Opt.none()
  },
  Effect.withLogSpan('Vibrate'),
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
  const { items } = state.list
  // The last rows leave with the whole list, which fades over the empty state.
  if (!Arr.isReadonlyArrayNonEmpty(items)) {
    return { _tag: 'Empty' }
  }
  const { selection, maybeNow } = state
  // A row leaving is no longer a product of the list: it cannot be selected, nor opened.
  const itemSelectionOf = (id: string, presence: Presence, isProduct: boolean): ItemSelection => {
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
  // Until the clock has ticked, the products that expire have no status: the list waits for it.
  const maybeProducts = Opt.all(Arr.map(rowsOf(state.list), ({ item, presence }) =>
    Match.valueTags(item, {
      Corrupt: ({ maybeName }): Opt.Option<ProductModel> => Opt.some({ _tag: 'Corrupt', maybeName }),
      Invalid: ({ id, maybeName }): Opt.Option<ProductModel> =>
        Opt.some({ _tag: 'Invalid', id, selection: itemSelectionOf(id, presence, false), presence, maybeName }),
      Valid: ({ id, product }): Opt.Option<ProductModel> =>
        Opt.map(maybeStatusAt(maybeNow, product), (status) => ({
          _tag: 'Valid',
          id,
          selection: itemSelectionOf(id, presence, true),
          presence,
          name: product.name,
          status,
        })),
    })))
  if (Opt.isNone(maybeProducts) || !Arr.isReadonlyArrayNonEmpty(maybeProducts.value)) {
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

export type Deps = DeleteProducts.DeleteProducts | ProductList | Haptics

export const program: Tea.Program<{
  state: State
  model: Model
  message: Message
  command: Command
  services: Deps
  event: Event
}> = {
  init: {
    state: {
      maybeNow: Opt.none(),
      list: { _tag: 'Loading' },
      selection: Selection.Idle(),
      snackbar: Snackbar.None(),
    },
  },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    ListChanged: ({ result }) => (state) => {
      const list: State['list'] = Result.match(result, {
        onFailure: () => ({ _tag: 'Failed' }),
        onSuccess: (stored): Loaded => {
          const items = Arr.map(stored, validate)
          if (state.list._tag !== 'Loaded') {
            return { _tag: 'Loaded', items, arrivals: HashSet.empty(), departures: [] }
          }
          const ids = idsOf(items)
          // The storage may tell of one write in more changes than one, before the page draws a frame: the rows
          // still arriving keep arriving, and the ones leaving keep leaving, unless they are back.
          return {
            _tag: 'Loaded',
            items,
            arrivals: HashSet.union(
              HashSet.difference(ids, idsOf(state.list.items)),
              HashSet.intersection(state.list.arrivals, ids),
            ),
            departures: departuresFrom(rowsOf(state.list), ids),
          }
        },
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
        : Tea.defect('TimeChanged while no listed product expires: the clock runs only while one does'),

    // Only a product of the list can be selected: a tap on a row the storage has meanwhile removed does nothing.
    ItemSelected: ({ id, by }) => (state) =>
      HashSet.has(selectableIds(state), id) && !HashSet.has(selectedIds(state.selection), id)
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
    Deleted: ({ at }) => (state) =>
      state.selection._tag === 'Deleting'
        ? {
          state: {
            ...state,
            selection: Selection.Idle(),
            snackbar: snackbarOf(
              state,
              at,
              Notice.Deleted({
                count: PositiveInteger.makeUnsafe(HashSet.size(state.selection.ids)),
                maybeProducts: state.selection.maybeProducts,
              }),
            ),
          },
          commands: [Command.Vibrate({ feedback: 'Confirm' })],
        }
        : Tea.defect('Deleted while no deletion is in progress: only a completion leaves Deleting'),

    // Its snackbar replaces the one standing, and the offer to undo with it.
    DeleteFailed: ({ at }) => (state) =>
      state.selection._tag === 'Deleting'
        ? {
          state: {
            ...state,
            selection: Selection.Selecting({ ids: state.selection.ids }),
            snackbar: snackbarOf(state, at, Notice.DeleteFailed()),
          },
          commands: [Command.Vibrate({ feedback: 'Reject' })],
        }
        : Tea.defect('DeleteFailed while no deletion is in progress: only a completion leaves Deleting'),

    // Only a deletion of products alone can be undone; the offer is taken at once, so a second tap does nothing.
    UndoRequested: () => (state) =>
      state.snackbar._tag === 'Shown' && state.snackbar.notice._tag === 'Deleted'
        && Opt.isSome(state.snackbar.notice.maybeProducts)
        ? {
          state: { ...state, snackbar: Snackbar.None() },
          commands: [Command.Restore({ products: state.snackbar.notice.maybeProducts.value })],
        }
        : Tea.reject,

    SnackbarExpired: () => (state) =>
      state.snackbar._tag === 'Shown'
        ? { state: { ...state, snackbar: Snackbar.None() } }
        : Tea.defect('SnackbarExpired while no snackbar is shown: the timer runs only while one is'),

    // The clock may have run only for a product leaving: the time it told goes with it.
    RowsSettled: () => (state) => {
      if (state.list._tag !== 'Loaded' || !isSettling(state.list)) {
        return Tea.defect('RowsSettled while no row arrives or leaves: the timer runs only while one does')
      }
      const list: Loaded = { ...state.list, arrivals: HashSet.empty(), departures: [] }
      return { state: { ...state, list, maybeNow: needsClock(list) ? state.maybeNow : Opt.none() } }
    },

    // Accepted in every state: the user may have done anything since asking, and the storage is as it was.
    RestoreFailed: ({ at }) => (state) => ({
      state: { ...state, snackbar: snackbarOf(state, at, Notice.RestoreFailed()) },
      commands: [Command.Vibrate({ feedback: 'Reject' })],
    }),
  }),

  runCommand: Match.typeTags<Command>()({
    Delete: deleteProducts,
    Restore: restoreProducts,
    Vibrate: vibrate,
  }),

  subscriptions: (state) => {
    const withClock = needsClock(state.list) ? HashMap.set(always, 'clock', clock) : always
    const withSettling = state.list._tag === 'Loaded' && isSettling(state.list)
      ? HashMap.set(
        withClock,
        ['settling', state.list.arrivals, idsOf(Arr.map(state.list.departures, ({ item }) => item))] as const,
        settlingTimer,
      )
      : withClock
    if (state.snackbar._tag === 'None') {
      return withSettling
    }
    const { at, notice } = state.snackbar
    return HashMap.set(withSettling, ['snackbar', at, notice._tag] as const, snackbarTimer(at, notice))
  },

  makeModel: (state) => ({
    list: listModel(state),
    snackbar: Match.valueTags(state.snackbar, {
      None: (): Model['snackbar'] => ({ _tag: 'None' }),
      Shown: ({ at, notice, entrance }): Model['snackbar'] => ({
        _tag: 'Shown',
        at,
        entrance,
        notice: notice._tag === 'Deleted'
          ? {
            _tag: 'Deleted',
            count: notice.count,
            maybeUndo: Opt.map(notice.maybeProducts, () => Message.UndoRequested()),
          }
          : notice,
      }),
    }),
  }),
}
