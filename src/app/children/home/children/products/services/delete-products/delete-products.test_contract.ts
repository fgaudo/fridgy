// What every adapter of `DeleteProducts` must do. It holds no implementation: each adapter's
// `<service>.<backing>.test.ts` runs it with its own layer, and with the storage's own `insert` and `readBack`,
// which reach that adapter's storage without a service.
import { describe, test } from 'bun:test'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import type * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as ProductArbitrary from '#domain/product.test_arbitrary.ts'
import * as Product from '#domain/product.ts'
import { checkOnFreshLayer } from '#libs/testing/fresh-layer.test_support.ts'
import * as DeleteProducts from './delete-products.ts'

const deleteById = Effect.fnUntraced(function*(id: string) {
  const { deleteById } = yield* DeleteProducts.DeleteProducts
  return yield* Effect.request(DeleteProducts.DeleteProductById({ id }), deleteById)
})

/** The adapter's storage, reached without a service. */
export type Storage<R> = Readonly<{
  /** Stores a product, answering with its id. */
  insert: (snapshot: Product.Snapshot) => Effect.Effect<string, never, R>
  /** What is stored under `id`. */
  readBack: (id: string) => Effect.Effect<Opt.Option<Product.UnvalidatedSnapshot>, never, R>
}>

// Strings that a loose parser would read as a stored id (the first product gets id 1).
const unknownId = fc.oneof(
  fc.string(),
  fc.integer({ min: 1_000_000 }).map(String),
  fc.constantFrom('1 ', ' 1', '01', '1.0', '1e0', '+1'),
)

export const deleteProductsContract = <R>(
  name: string,
  adapter: () => Layer.Layer<DeleteProducts.DeleteProducts | R>,
  { insert, readBack }: Storage<R>,
) =>
  describe(`DeleteProducts contract (${name})`, () => {
    const store = (product: Product.Product) => insert(Product.toSnapshot(product))
    const readsBackAs = (id: string, product: Product.Product) =>
      readBack(id).pipe(
        Effect.map((stored) => Opt.exists(stored, (s) => Equal.equals(Product.fromSnapshot(s), Opt.some(product)))),
      )
    const isStored = (id: string) => readBack(id).pipe(Effect.map(Opt.isSome))

    test('deleting a product removes it, and only it', () =>
      checkOnFreshLayer(
        adapter,
        fc.tuple(ProductArbitrary.arbitrary, ProductArbitrary.arbitrary),
        Effect.fnUntraced(function*([kept, deleted]) {
          const keptId = yield* store(kept)
          const deletedId = yield* store(deleted)
          yield* deleteById(deletedId)
          return !(yield* isStored(deletedId)) && (yield* readsBackAs(keptId, kept))
        }),
      ))

    // SQLite gives the next product the id of the last one deleted: an expiration left behind would be its.
    test('a product stored after a deletion has no expiration but its own', () =>
      checkOnFreshLayer(
        adapter,
        fc.tuple(
          ProductArbitrary.arbitrary.filter((product) => Opt.isSome(product.maybeExpirationDate)),
          ProductArbitrary.arbitrary.filter((product) => Opt.isNone(product.maybeExpirationDate)),
        ),
        Effect.fnUntraced(function*([expiring, everlasting]) {
          yield* deleteById(yield* store(expiring))
          return yield* readsBackAs(yield* store(everlasting), everlasting)
        }),
      ))

    test('deleting an id that is not stored completes and changes nothing', () =>
      checkOnFreshLayer(
        adapter,
        fc.tuple(ProductArbitrary.arbitrary, unknownId),
        Effect.fnUntraced(function*([product, unknownId]) {
          const id = yield* store(product)
          // A storage may start with sample products: an id it holds is not a counterexample.
          if (yield* isStored(unknownId)) return true
          yield* deleteById(unknownId).pipe(Effect.ignore)
          return yield* readsBackAs(id, product)
        }),
      ))
  })
