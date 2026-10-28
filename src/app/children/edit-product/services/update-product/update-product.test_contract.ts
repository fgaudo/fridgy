// What every adapter of `UpdateProduct` must do. It holds no implementation: each adapter's
// `<service>.<backing>.test.ts` runs it with its own layer, and with the storage's own `insert`, `readBack` and
// `readAll`, which reach that adapter's storage without a service.
import { describe, test } from 'bun:test'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import type * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as ProductArbitrary from '#domain/product.test_arbitrary.ts'
import * as Product from '#domain/product.ts'
import { checkOnFreshLayer } from '#libs/testing/fresh-layer.test_support.ts'
import { UpdateProduct } from './update-product.ts'

/** The adapter's storage, reached without a service. */
export type Storage<R> = Readonly<{
  /** Stores a product, answering with its id. */
  insert: (snapshot: Product.Snapshot) => Effect.Effect<string, never, R>
  /** What is stored under `id`, its expiration joined. */
  readBack: (id: string) => Effect.Effect<Opt.Option<Product.UnvalidatedSnapshot>, never, R>
  /** Everything that is stored. */
  readAll: Effect.Effect<ReadonlyArray<Product.UnvalidatedSnapshot>, never, R>
}>

const update = (id: string, product: Product.Product) =>
  UpdateProduct.use(({ update }) => update(id, Product.toSnapshot(product)))

// Strings that a loose parser would read as a stored id (the first product gets id 1).
const unknownId = fc.oneof(
  fc.string(),
  fc.integer({ min: 1_000_000 }).map(String),
  fc.constantFrom('1 ', ' 1', '01', '1.0', '1e0', '+1'),
)

const expiring = ProductArbitrary.arbitrary.filter((product) => Opt.isSome(product.maybeExpirationDate))

const everlasting = ProductArbitrary.arbitrary.filter((product) => Opt.isNone(product.maybeExpirationDate))

export const updateProductContract = <R>(
  name: string,
  adapter: () => Layer.Layer<UpdateProduct | R>,
  { insert, readBack, readAll }: Storage<R>,
) =>
  describe(`UpdateProduct contract (${name})`, () => {
    const store = (product: Product.Product) => insert(Product.toSnapshot(product))
    const readsBackAs = (id: string, product: Product.Product) =>
      readBack(id).pipe(
        Effect.map((stored) => Opt.exists(stored, (s) => Equal.equals(Product.fromSnapshot(s), Opt.some(product)))),
      )

    test('a product updated reads back as written, and the others as they were', () =>
      checkOnFreshLayer(
        adapter,
        fc.tuple(ProductArbitrary.arbitrary, ProductArbitrary.arbitrary, ProductArbitrary.arbitrary),
        Effect.fnUntraced(function*([kept, before, after]) {
          const keptId = yield* store(kept)
          const id = yield* store(before)
          yield* update(id, after)
          return (yield* readsBackAs(id, after)) && (yield* readsBackAs(keptId, kept))
        }),
      ))

    // `readBack` joins the expiration: one left behind, or a second one, would show.
    test('an expiration is added, changed and removed with the product', () =>
      checkOnFreshLayer(
        adapter,
        fc.tuple(everlasting, expiring, expiring),
        Effect.fnUntraced(function*([first, added, changed]) {
          const id = yield* store(first)
          yield* update(id, added)
          const isAdded = yield* readsBackAs(id, added)
          yield* update(id, changed)
          const isChanged = yield* readsBackAs(id, changed)
          yield* update(id, first)
          const isRemoved = yield* readsBackAs(id, first)
          return isAdded && isChanged && isRemoved && (yield* readAll).length === 1
        }),
      ))

    test('an id that is not stored fails, and changes nothing', () =>
      checkOnFreshLayer(
        adapter,
        fc.tuple(ProductArbitrary.arbitrary, ProductArbitrary.arbitrary, unknownId),
        Effect.fnUntraced(function*([stored, written, unknownId]) {
          const id = yield* store(stored)
          // A storage may start with sample products: an id it holds is not a counterexample.
          if (Opt.isSome(yield* readBack(unknownId))) return true
          const failure = yield* Effect.flip(update(unknownId, written))
          return failure._tag === 'ProductNotStored' && (yield* readsBackAs(id, stored))
            && (yield* readAll).length === 1
        }),
      ))
  })
