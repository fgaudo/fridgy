import * as Data from 'effect/Data'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as ProductArbitrary from '#domain/product.test_arbitrary.ts'
import * as NonEmptyHashSet from '#libs/collections/non-empty-hash-set.test_arbitrary.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import type { StoredProduct } from './services/product-list/product-list.ts'
import type { Message, Product, State } from './program.ts'

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

export const selecting = maybe(NonEmptyHashSet.arbitrary(id)).map((maybeIds) => (
  { _tag: 'Selecting', maybeIds } as const
))

export const deleting = NonEmptyHashSet.arbitrary(id).map((ids) => ({ _tag: 'Deleting', ids } as const))

export const selection: fc.Arbitrary<State['selection']> = fc.oneof(selecting, deleting)

export const state: fc.Arbitrary<State> = fc.record({ maybeNow: maybe(utc), list, selection })

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
  utc.map((now) => Msg.TimeChanged({ now })),
  fc.oneof(
    fc.constant(Result.fail(undefined)),
    storedProducts.map((products) => Result.succeed(products)),
  ).map((result) => Msg.ListChanged({ result })),
  fc.boolean().map((succeeded) => Msg.DeleteCompleted({ succeeded })),
)
