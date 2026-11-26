// The list of `Products`: the stored products, as of the latest change of the storage, `Loading` until the first
// and `Failed` when it could not be read. A change brings rows in, which arrive, and takes rows out, which leave,
// until they have settled.
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as Domain from '#domain/product.ts'
import { ProductStore, type ProductsReadError, type StoredProduct } from '#infrastructure/storage/products.ts'
import { duration } from '#libs/material/durations.ts'
import * as PositiveInteger from '#libs/numbers/positive-integer.ts'
import { after } from '#libs/timers/timers.ts'
import * as Clock from './clock.ts'
import type { State, Transition } from './program.ts'
import * as Selection from './selection.ts'

export type Product = Data.TaggedEnum<{
  /** Stored, but not a valid product: it can still be selected and deleted. */
  Invalid: Readonly<{ id: Domain.ProductId; maybeName: Opt.Option<string> }>
  Valid: Readonly<{ id: Domain.ProductId; product: Domain.Product }>
}>

const Product = Data.taggedEnum<Product>()

/**
 * A row the storage no longer lists, kept after the row it followed (or first) while it closes its place: the rows
 * under it rise, rather than jump to their new place.
 */
export type Departure = Readonly<{ item: Product; maybeAfter: Opt.Option<Domain.ProductId> }>

export type List = Data.TaggedEnum<{
  Loading: object
  Failed: object
  Loaded: Readonly<{
    items: ReadonlyArray<Product>
    /** The ids a change brought into a list already shown, until they have arrived. A first list appears whole. */
    arrivals: HashSet.HashSet<Domain.ProductId>
    /** The rows that changes took out of the list, in the order they were shown, until they have left. */
    departures: ReadonlyArray<Departure>
  }>
}>

type Loaded = Data.TaggedEnum.Value<List, 'Loaded'>

export type Message = Data.TaggedEnum<{
  ListChanged: { result: Result.Result<ReadonlyArray<StoredProduct>, ProductsReadError> }
  /** The arriving rows have opened their place, and the leaving ones closed theirs. */
  RowsSettled: object
}>

const Message = Data.taggedEnum<Message>()

/** The settling timer is keyed by the ids arriving and leaving: a new one starts it anew. */
export type Settle = Data.TaggedEnum<{
  Settling: { arrivals: HashSet.HashSet<Domain.ProductId>; departures: HashSet.HashSet<Domain.ProductId> }
}>

const Settle = Data.taggedEnum<Settle>()

export type Key = 'changes' | Settle

/** Whether a row opens its place, has it, or closes it. */
export type Presence = 'Arriving' | 'Listed' | 'Leaving'

/** How the rows that stay move: after a row arriving, which opens its place, or one leaving, which closes it. */
export type Settling = 'Still' | 'Opening' | 'Closing'

export type ProductModel = Data.TaggedEnum<{
  Invalid: Readonly<
    { id: Domain.ProductId; selection: Selection.ItemSelection; presence: Presence; maybeName: Opt.Option<string> }
  >
  Valid: Readonly<
    {
      id: Domain.ProductId
      selection: Selection.ItemSelection
      presence: Presence
      name: string
      status: Clock.ProductStatus
    }
  >
}>

export type ListModel = Data.TaggedEnum<{
  /** Until the list is known, and the time with it when a product expires. */
  Initial: object
  Error: object
  Empty: object
  Available: Readonly<{
    deletion: Selection.Deletion
    total: PositiveInteger.PositiveInteger
    /** The shorter motion, closing, wins when rows arrive and leave at once. */
    settling: Settling
    /** The products listed, in order, with the ones leaving where they were. */
    products: Arr.NonEmptyReadonlyArray<ProductModel>
  }>
}>

// Stored data that is not a product can still be selected and deleted, by its id.
const validate = (stored: StoredProduct): Product =>
  Opt.match(Domain.fromSnapshot(stored), {
    onNone: () => Product.Invalid({ id: stored.id, maybeName: stored.maybeName }),
    onSome: (product) => Product.Valid({ id: stored.id, product }),
  })

const idsOf = (items: ReadonlyArray<Product>) => HashSet.fromIterable(Arr.map(items, (product) => product.id))

type Row = Readonly<{ item: Product; presence: Presence }>

/** The listed rows, each leaving one after the row it followed and after the rows that left from there before it. */
const rowsOf = ({ items, arrivals, departures }: Loaded): ReadonlyArray<Row> =>
  Arr.reduce(
    departures,
    Arr.map(items, (item): Row => ({
      item,
      presence: HashSet.has(arrivals, item.id) ? 'Arriving' : 'Listed',
    })),
    (rows, { item, maybeAfter }) => {
      const anchor = Opt.match(maybeAfter, {
        onNone: () => 0,
        onSome: (id) =>
          pipe(
            Arr.findFirstIndex(rows, (row) => row.item.id === id),
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
const departuresFrom = (rows: ReadonlyArray<Row>, ids: HashSet.HashSet<Domain.ProductId>): ReadonlyArray<Departure> =>
  Arr.reduce(
    rows,
    { maybeAfter: Opt.none<Domain.ProductId>(), departures: Arr.empty<Departure>() },
    ({ maybeAfter, departures }, { item }) => ({
      maybeAfter: Opt.some(item.id),
      departures: HashSet.has(ids, item.id) ? departures : [...departures, { item, maybeAfter }],
    }),
  ).departures

/** Whether a row opens or closes its place. */
const isSettling = (list: List) =>
  list._tag === 'Loaded' && (HashSet.size(list.arrivals) > 0 || Arr.isReadonlyArrayNonEmpty(list.departures))

export const changes: Tea.Subscription<Message, ProductStore> = Channel.unwrap(
  Effect.map(
    Effect.service(ProductStore),
    ({ changes }) => Channel.map(changes, (result) => Message.ListChanged({ result })),
  ),
)

// Longer than a row's entrance (medium-4, and the frame it waits for) and its exit (short-4): a row is drawn as any
// other, or gone, only once it has opened or closed its place. Hidden under another page, the timer waits for the
// page to be back.
const SETTLING_DURATION = Duration.millis(duration.long2)

/** Ends once the rows have been shown arriving and leaving. */
export const settlingTimer: Tea.Subscription<Message> = after(SETTLING_DURATION, Message.RowsSettled())

export const subscriptions = (state: State): ReadonlyArray<Key> => [
  'changes',
  ...(state.list._tag === 'Loaded' && isSettling(state.list)
    ? [
      Settle.Settling({
        arrivals: state.list.arrivals,
        departures: idsOf(Arr.map(state.list.departures, ({ item }) => item)),
      }),
    ]
    : []),
]

export const update = Match.typeTags<Message, (state: State) => Transition>()({
  // The selection and the clock follow the list.
  ListChanged: ({ result }) => (state) => {
    const list: List = Result.match(result, {
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
    return pipe({ state: { ...state, list } }, Tea.andThen(Selection.listChanged), Tea.andThen(Clock.listChanged))
  },

  // The clock may have run only for a product leaving.
  RowsSettled: () => (state) => {
    if (state.list._tag !== 'Loaded' || !isSettling(state.list)) {
      return Tea.defect('RowsSettled while no row arrives or leaves: the timer runs only while one does')
    }
    return Clock.listChanged({ ...state, list: { ...state.list, arrivals: HashSet.empty(), departures: [] } })
  },
})

export const model = (state: State): ListModel => {
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
  // Until the clock has ticked, the products that expire have no status: the list waits for it.
  const maybeProducts = Opt.all(Arr.map(rowsOf(state.list), ({ item, presence }) =>
    Match.valueTags(item, {
      Invalid: ({ id, maybeName }): Opt.Option<ProductModel> =>
        Opt.some({
          _tag: 'Invalid',
          id,
          selection: Selection.itemSelectionOf(state.selection, id, presence, false),
          presence,
          maybeName,
        }),
      Valid: ({ id, product }): Opt.Option<ProductModel> =>
        Opt.map(Clock.maybeStatusAt(state.maybeNow, product), (status) => ({
          _tag: 'Valid',
          id,
          selection: Selection.itemSelectionOf(state.selection, id, presence, true),
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
    deletion: Selection.deletionOf(state.selection),
    total: PositiveInteger.makeUnsafe(items.length),
    settling: Arr.isReadonlyArrayNonEmpty(state.list.departures)
      ? 'Closing'
      : HashSet.size(state.list.arrivals) > 0
      ? 'Opening'
      : 'Still',
    products: maybeProducts.value,
  }
}
