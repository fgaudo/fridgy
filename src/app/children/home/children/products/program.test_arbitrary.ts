import type * as Tea from '@fgaudo/effect-tea'
import { stateOf } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as SnackbarArbitrary from '#app/programs/snackbar/program.test_arbitrary.ts'
import type * as Snackbar from '#app/programs/snackbar/program.ts'
import * as ProductArbitrary from '#domain/product.test_arbitrary.ts'
import type { ProductId } from '#domain/product.ts'
import { ProductsReadError, type StoredProduct } from '#infrastructure/storage/products.ts'
import * as NonEmptyHashSet from '#libs/collections/non-empty-hash-set.test_arbitrary.ts'
import * as PositiveInteger from '#libs/numbers/positive-integer.test_arbitrary.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { zoned } from '#libs/testing/date-time.test_arbitrary.ts'
import type { Departure, Product } from './list.ts'
import { type Message, program, type State } from './program.ts'
import type { Gesture, Notice, Selection } from './selection.ts'

const Msg = Data.taggedEnum<Message>()

// A small id space, so that selections and product lists overlap often.
const IDS = [1, 2, 3, 4, 5, 6].map(ProductArbitrary.nthId)

export const id: fc.Arbitrary<ProductId> = fc.constantFrom(...IDS)

export const gesture: fc.Arbitrary<Gesture> = fc.constantFrom('Tap', 'LongPress')

export const product: fc.Arbitrary<Product> = fc.oneof(
  fc.record({ id, product: ProductArbitrary.arbitrary }).map((fields) => ({ _tag: 'Valid', ...fields } as const)),
  fc.record({ id, maybeName: maybe(fc.string()) }).map((fields) => ({ _tag: 'Invalid', ...fields } as const)),
)

/** The products of a list, as the storage lists them: each id once. */
export const products = (constraints: { minLength?: number } = {}): fc.Arbitrary<ReadonlyArray<Product>> =>
  fc.uniqueArray(product, { ...constraints, maxLength: 8, selector: (item) => item.id })

/** A product that is no longer listed, with that id. */
const leavingWith = (leavingId: ProductId): fc.Arbitrary<Product> =>
  fc.oneof(
    ProductArbitrary.arbitrary.map((product) => ({ _tag: 'Valid', id: leavingId, product } as const)),
    maybe(fc.string()).map((maybeName) => ({ _tag: 'Invalid', id: leavingId, maybeName } as const)),
  )

/**
 * The rows leaving as a change leaves them: placed among the listed ones, in the order they were shown, each after
 * the row with an id it followed.
 */
const departuresAmong = (items: ReadonlyArray<Product>, leaving: ReadonlyArray<Product>) =>
  fc.tuple(...leaving.map(() => fc.nat({ max: items.length }))).map((places) => {
    const shown = leaving.reduce<ReadonlyArray<Product | { leaving: Product }>>(
      (rows, item, index) => [...rows.slice(0, places[index]), { leaving: item }, ...rows.slice(places[index])],
      items,
    )
    return shown.reduce<{ maybeAfter: Opt.Option<ProductId>; departures: ReadonlyArray<Departure> }>(
      ({ maybeAfter, departures }, row) =>
        'leaving' in row
          ? { maybeAfter: Opt.some(row.leaving.id), departures: [...departures, { item: row.leaving, maybeAfter }] }
          : { maybeAfter: Opt.some(row.id), departures },
      { maybeAfter: Opt.none(), departures: [] },
    ).departures
  })

/**
 * A loaded list of those products, some of whose rows may be arriving, with rows leaving that it no longer lists.
 */
export const loadedOf = (items: ReadonlyArray<Product>): fc.Arbitrary<State['list']> => {
  const ids = items.map((item) => item.id)
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

export const notice: fc.Arbitrary<Notice> = fc.oneof(
  fc.record({ count: PositiveInteger.arbitrary({ max: 6 }), maybeProducts: restorable }).map((fields) => (
    { _tag: 'Deleted', ...fields } as const
  )),
  fc.constant({ _tag: 'DeleteFailed' } as const),
  fc.constant({ _tag: 'RestoreFailed' } as const),
)

/** The snackbar, standing or not, of the notices Products tells. */
export const snackbar: fc.Arbitrary<Snackbar.State<Notice>> = SnackbarArbitrary.state(notice)

/** Whether a product shown, listed or leaving, expires: the clock runs, and the time is known, only then. */
export const hasExpiringProduct = (state: State) =>
  state.list._tag === 'Loaded'
  && [...state.list.items, ...state.list.departures.map(({ item }) => item)].some((item) =>
    item._tag === 'Valid' && Opt.isSome(item.product.maybeExpirationDate)
  )

/** Any state of Products' own, with a time only while a product expires. */
export const own: fc.Arbitrary<State> = fc.record({ maybeNow: maybe(zoned), list, selection }).map((
  state,
) => hasExpiringProduct(state) ? state : { ...state, maybeNow: Opt.none() })

/** Products' whole state: its own, and its snackbar's. */
export type Whole = Tea.StateOf<typeof program>

/** The whole states of those own states, with those of the snackbar. */
export const wholeOf = (
  owns: fc.Arbitrary<State>,
  snackbars: fc.Arbitrary<Snackbar.State<Notice>> = snackbar,
): fc.Arbitrary<Whole> => fc.tuple(owns, snackbars).map(([own, Snackbar]) => stateOf(program, own, { Snackbar }))

/** Any state. */
export const state: fc.Arbitrary<Whole> = wholeOf(own)

/** The states in which the clock runs. */
export const ticking: fc.Arbitrary<Whole> = wholeOf(own.filter(hasExpiringProduct))

/** The states in which it does not. */
export const still: fc.Arbitrary<Whole> = wholeOf(own.filter((state) => !hasExpiringProduct(state)))

export const stateWith = <K extends keyof State>(key: K, arbitrary: fc.Arbitrary<State[K]>) =>
  wholeOf(fc.tuple(own, arbitrary).map(([base, value]): State => ({ ...base, [key]: value })))

/** What the product storage may send: products valid or not, each id once. */
export const storedProducts: fc.Arbitrary<ReadonlyArray<StoredProduct>> = fc.uniqueArray(
  fc.tuple(id, ProductArbitrary.unvalidatedSnapshot).map(([id, snapshot]) => ({ ...snapshot, id })),
  { maxLength: 8, selector: (stored) => stored.id },
)

/** Any message of Products' own: the snackbar's are tested in its own folder. */
export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.record({ id, by: gesture }).map(Msg.ItemSelected),
  id.map((id) => Msg.EditRequested({ id })),
  fc.record({ id, by: gesture }).map(Msg.ItemDeselected),
  fc.constant(Msg.SelectionCleared()),
  fc.constant(Msg.BackPressed()),
  fc.constant(Msg.DeleteStarted()),
  fc.constant(Msg.UndoRequested()),
  fc.constant(Msg.RowsSettled()),
  fc.constant(Msg.DeleteFailed()),
  fc.constant(Msg.RestoreFailed()),
  fc.constant(Msg.Deleted()),
  zoned.map((now) => Msg.TimeChanged({ now })),
  fc.oneof(
    fc.string().map((cause) => Result.fail(new ProductsReadError({ cause }))),
    storedProducts.map((products) => Result.succeed(products)),
  ).map((result) => Msg.ListChanged({ result })),
)
