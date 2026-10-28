import * as Data from 'effect/Data'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as ProductArbitrary from '#domain/product.test_arbitrary.ts'
import * as NonEmptyHashSet from '#libs/collections/non-empty-hash-set.test_arbitrary.ts'
import * as PositiveInteger from '#libs/numbers/positive-integer.test_arbitrary.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import type { Departure, Entrance, LastDeletion, Message, Product, Selection, State } from './program.ts'
import { ProductListReadError, type StoredProduct } from './services/product-list/product-list.ts'

const Msg = Data.taggedEnum<Message>()

// A small id space, so that selections and product lists overlap often.
const IDS = ['1', '2', '3', '4', '5', '6']

export const id: fc.Arbitrary<string> = fc.constantFrom(...IDS)

export const product: fc.Arbitrary<Product> = fc.oneof(
  fc.record({ id, product: ProductArbitrary.arbitrary }).map((fields) => ({ _tag: 'Valid', ...fields } as const)),
  fc.record({ id, maybeName: maybe(fc.string()) }).map((fields) => ({ _tag: 'Invalid', ...fields } as const)),
  maybe(fc.string()).map((maybeName) => ({ _tag: 'Corrupt', maybeName } as const)),
)

/** Whether two rows of the storage have the same id: the storage's key lists each id once. */
const sameId = (a: Product, b: Product) => a._tag !== 'Corrupt' && b._tag !== 'Corrupt' && a.id === b.id

/** The products of a list, as the storage lists them: each id once. */
export const products = (constraints: { minLength?: number } = {}): fc.Arbitrary<ReadonlyArray<Product>> =>
  fc.uniqueArray(product, { ...constraints, maxLength: 8, comparator: sameId })

type Leaving = Departure['item']

/** A product that is no longer listed, with that id. */
const leavingWith = (leavingId: string): fc.Arbitrary<Leaving> =>
  fc.oneof(
    ProductArbitrary.arbitrary.map((product) => ({ _tag: 'Valid', id: leavingId, product } as const)),
    maybe(fc.string()).map((maybeName) => ({ _tag: 'Invalid', id: leavingId, maybeName } as const)),
  )

/**
 * The rows leaving as a change leaves them: placed among the listed ones, in the order they were shown, each after
 * the row with an id it followed.
 */
const departuresAmong = (items: ReadonlyArray<Product>, leaving: ReadonlyArray<Leaving>) =>
  fc.tuple(...leaving.map(() => fc.nat({ max: items.length }))).map((places) => {
    const shown = leaving.reduce<ReadonlyArray<Product | { leaving: Leaving }>>(
      (rows, item, index) => [...rows.slice(0, places[index]), { leaving: item }, ...rows.slice(places[index])],
      items,
    )
    return shown.reduce<{ maybeAfter: Opt.Option<string>; departures: ReadonlyArray<Departure> }>(
      ({ maybeAfter, departures }, row) =>
        'leaving' in row
          ? { maybeAfter: Opt.some(row.leaving.id), departures: [...departures, { item: row.leaving, maybeAfter }] }
          : row._tag === 'Corrupt'
          ? { maybeAfter, departures }
          : { maybeAfter: Opt.some(row.id), departures },
      { maybeAfter: Opt.none(), departures: [] },
    ).departures
  })

/**
 * A loaded list of those products, some of whose rows may be arriving, with rows leaving that it no longer lists.
 */
export const loadedOf = (items: ReadonlyArray<Product>): fc.Arbitrary<State['list']> => {
  const ids = items.flatMap((item) => item._tag === 'Corrupt' ? [] : [item.id])
  const freeIds = IDS.filter((id) => !ids.includes(id))
  return fc.record({
    arriving: fc.subarray(ids),
    departures: fc.shuffledSubarray(freeIds, { maxLength: Math.min(3, freeIds.length) })
      .chain((leavingIds) => fc.tuple(...leavingIds.map(leavingWith)))
      .chain((leaving) => departuresAmong(items, leaving)),
  }).map(({ arriving, departures }) => (
    { _tag: 'Loaded', items, arrivals: HashSet.fromIterable(arriving), departures } as const
  ))
}

export const list: fc.Arbitrary<State['list']> = fc.oneof(
  fc.constant({ _tag: 'Loading' } as const),
  fc.constant({ _tag: 'Failed' } as const),
  products().chain(loadedOf),
)

export const idle: fc.Arbitrary<Selection> = fc.constant({ _tag: 'Idle' } as const)

export const selecting: fc.Arbitrary<Selection> = NonEmptyHashSet.arbitrary(id).map((ids) => (
  { _tag: 'Selecting', ids } as const
))

/** The products of a deletion, when every one of the deleted was one. */
const restorable = maybe(
  fc.tuple(ProductArbitrary.arbitrary, fc.array(ProductArbitrary.arbitrary, { maxLength: 3 })).map((
    [first, rest],
  ) => [first, ...rest] as const),
)

export const deleting: fc.Arbitrary<Selection> = fc.record({
  ids: NonEmptyHashSet.arbitrary(id),
  maybeProducts: restorable,
}).map((fields) => ({ _tag: 'Deleting', ...fields } as const))

export const selection: fc.Arbitrary<Selection> = fc.oneof(idle, selecting, deleting)

export const recent: fc.Arbitrary<LastDeletion> = fc.record({
  at: utc,
  count: PositiveInteger.arbitrary({ max: 6 }),
  maybeProducts: restorable,
  entrance: fc.constantFrom<Entrance>('Alone', 'AfterAnother'),
}).map((fields) => ({ _tag: 'Recent', ...fields } as const))

export const lastDeletion: fc.Arbitrary<LastDeletion> = fc.oneof(fc.constant({ _tag: 'None' } as const), recent)

/** Whether a product shown, listed or leaving, expires: the clock runs, and the time is known, only then. */
export const hasExpiringProduct = (state: State) =>
  state.list._tag === 'Loaded'
  && [...state.list.items, ...state.list.departures.map(({ item }) => item)].some((item) =>
    item._tag === 'Valid' && Opt.isSome(item.product.maybeExpirationDate)
  )

/** Any state, with a time only while a product expires. */
export const state: fc.Arbitrary<State> = fc.record({ maybeNow: maybe(utc), list, selection, lastDeletion }).map((
  state,
) => hasExpiringProduct(state) ? state : { ...state, maybeNow: Opt.none() })

/** The states in which the clock runs. */
export const ticking: fc.Arbitrary<State> = state.filter(hasExpiringProduct)

/** The states in which it does not. */
export const still: fc.Arbitrary<State> = state.filter((state) => !hasExpiringProduct(state))

export const stateWith = <K extends keyof State>(key: K, arbitrary: fc.Arbitrary<State[K]>) =>
  fc.tuple(state, arbitrary).map(([base, value]): State => ({ ...base, [key]: value }))

/** What the product storage may send: products with or without an id, valid or not, each id once. */
export const storedProducts: fc.Arbitrary<ReadonlyArray<StoredProduct>> = fc.uniqueArray(
  fc.tuple(maybe(id), ProductArbitrary.unvalidatedSnapshot).map(([maybeId, snapshot]) => ({ ...snapshot, maybeId })),
  { maxLength: 8, comparator: (a, b) => Opt.isSome(a.maybeId) && Opt.contains(b.maybeId, a.maybeId.value) },
)

export const message: fc.Arbitrary<Message> = fc.oneof(
  id.map((id) => Msg.ItemSelected({ id })),
  id.map((id) => Msg.EditRequested({ id })),
  id.map((id) => Msg.ItemDeselected({ id })),
  fc.constant(Msg.SelectionCleared()),
  fc.constant(Msg.DeleteStarted()),
  fc.constant(Msg.UndoRequested()),
  fc.constant(Msg.UndoExpired()),
  fc.constant(Msg.RowsSettled()),
  fc.constant(Msg.DeleteFailed()),
  fc.constant(Msg.RestoreFailed()),
  utc.map((at) => Msg.Deleted({ at })),
  utc.map((now) => Msg.TimeChanged({ now })),
  fc.oneof(
    fc.string().map((cause) => Result.fail(new ProductListReadError({ cause }))),
    storedProducts.map((products) => Result.succeed(products)),
  ).map((result) => Msg.ListChanged({ result })),
)
