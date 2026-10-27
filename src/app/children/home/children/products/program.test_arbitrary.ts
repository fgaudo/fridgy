import * as Data from 'effect/Data'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as ProductArbitrary from '#domain/product.test_arbitrary.ts'
import * as NonEmptyHashSet from '#libs/collections/non-empty-hash-set.test_arbitrary.ts'
import * as PositiveInteger from '#libs/numbers/positive-integer.test_arbitrary.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import type { LastDeletion, Message, Product, Selection, State } from './program.ts'
import { ProductListReadError, type StoredProduct } from './services/product-list/product-list.ts'

const Msg = Data.taggedEnum<Message>()

// A small id space, so that selections and product lists overlap often.
export const id: fc.Arbitrary<string> = fc.constantFrom('1', '2', '3', '4', '5', '6')

export const product: fc.Arbitrary<Product> = fc.oneof(
  fc.record({ id, product: ProductArbitrary.arbitrary }).map((fields) => ({ _tag: 'Valid', ...fields } as const)),
  fc.record({ id, maybeName: maybe(fc.string()) }).map((fields) => ({ _tag: 'Invalid', ...fields } as const)),
  maybe(fc.string()).map((maybeName) => ({ _tag: 'Corrupt', maybeName } as const)),
)

export const list: fc.Arbitrary<State['list']> = fc.oneof(
  fc.constant({ _tag: 'Loading' } as const),
  fc.constant({ _tag: 'Failed' } as const),
  fc.array(product, { maxLength: 8 }).map((items) => ({ _tag: 'Loaded', items } as const)),
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
}).map((fields) => ({ _tag: 'Recent', ...fields } as const))

export const lastDeletion: fc.Arbitrary<LastDeletion> = fc.oneof(fc.constant({ _tag: 'None' } as const), recent)

/** Whether a loaded product expires: the clock runs, and the time is known, only then. */
export const hasExpiringProduct = (state: State) =>
  state.list._tag === 'Loaded'
  && state.list.items.some((item) => item._tag === 'Valid' && Opt.isSome(item.product.maybeExpirationDate))

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

/** What the product storage may send: products with or without an id, valid or not. */
export const storedProducts: fc.Arbitrary<ReadonlyArray<StoredProduct>> = fc.array(
  fc.tuple(maybe(id), ProductArbitrary.unvalidatedSnapshot).map(([maybeId, snapshot]) => ({ ...snapshot, maybeId })),
  { maxLength: 8 },
)

export const message: fc.Arbitrary<Message> = fc.oneof(
  id.map((id) => Msg.ItemSelected({ id })),
  id.map((id) => Msg.ItemDeselected({ id })),
  fc.constant(Msg.SelectionCleared()),
  fc.constant(Msg.DeleteStarted()),
  fc.constant(Msg.UndoRequested()),
  fc.constant(Msg.UndoExpired()),
  fc.constant(Msg.DeleteFailed()),
  fc.constant(Msg.RestoreFailed()),
  utc.map((at) => Msg.Deleted({ at })),
  utc.map((now) => Msg.TimeChanged({ now })),
  fc.oneof(
    fc.string().map((cause) => Result.fail(new ProductListReadError({ cause }))),
    storedProducts.map((products) => Result.succeed(products)),
  ).map((result) => Msg.ListChanged({ result })),
)
