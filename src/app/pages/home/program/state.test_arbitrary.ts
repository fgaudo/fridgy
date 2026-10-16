import * as DateTime from 'effect/DateTime'
import * as fc from 'fast-check'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import * as NonEmptyHashSet from '#libs/collections/non-empty-hash-set.test_arbitrary.ts'
import * as ProductArbitrary from '#app/domain/product.test_arbitrary.ts'
import type { StoredProduct } from '../ports/product-list.ts'
import type { Product, State } from './state.ts'

// A small id space, so that selections and product lists overlap often.
export const id: fc.Arbitrary<string> = fc.constantFrom('1', '2', '3', '4', '5', '6')

export const date = fc.integer({ min: 0, max: 4_102_444_800_000 }).map((millis) => DateTime.makeUnsafe(millis))

export const product: fc.Arbitrary<Product> = fc.oneof(
  fc.record({ id, product: ProductArbitrary.arbitrary }).map((fields) => ({ _tag: 'Valid', ...fields } as const)),
  fc.record({ id, maybeName: maybe(fc.string()) }).map((fields) => ({ _tag: 'Invalid', ...fields } as const)),
  maybe(fc.string()).map((maybeName) => ({ _tag: 'Corrupt', maybeName } as const)),
)

export const products: fc.Arbitrary<State['products']> = fc.oneof(
  fc.constant({ _tag: 'Loading' } as const),
  fc.constant({ _tag: 'Failed' } as const),
  fc.array(product, { maxLength: 8 }).map((items) => ({ _tag: 'Loaded', items } as const)),
)

export const selecting = maybe(NonEmptyHashSet.arbitrary(id)).map((maybeIds) => (
  { _tag: 'Selecting', maybeIds } as const
))
export const deleting = NonEmptyHashSet.arbitrary(id).map((ids) => ({ _tag: 'Deleting', ids } as const))
export const selection: fc.Arbitrary<State['selection']> = fc.oneof(selecting, deleting)

const formFields = fc.record({ maybeName: maybe(fc.string()), maybeExpirationDate: maybe(date) })
export const closedForm = fc.constant({ _tag: 'Closed' } as const)
export const editingForm = formFields.map((fields) => ({ _tag: 'Editing', ...fields } as const))
export const submittingForm = formFields.map((fields) => ({ _tag: 'Submitting', ...fields } as const))
export const addProduct: fc.Arbitrary<State['addProduct']> = fc.oneof(closedForm, editingForm, submittingForm)

/** Any state of the page. */
export const state: fc.Arbitrary<State> = fc.record({
  isMenuOpen: fc.boolean(),
  isViewportAtTop: fc.boolean(),
  isInteracting: fc.boolean(),
  maybeNow: maybe(date),
  products,
  selection,
  addProduct,
})

export const stateWith = <K extends keyof State>(key: K, arbitrary: fc.Arbitrary<State[K]>) =>
  fc.tuple(state, arbitrary).map(([base, value]): State => ({ ...base, [key]: value }))

/** What the product storage may send: products with or without an id, valid or not. */
export const storedProducts: fc.Arbitrary<ReadonlyArray<StoredProduct>> = fc.array(
  fc.tuple(maybe(id), ProductArbitrary.unvalidatedSnapshot).map(([maybeId, snapshot]) => ({ ...snapshot, maybeId })),
  { maxLength: 8 },
)
