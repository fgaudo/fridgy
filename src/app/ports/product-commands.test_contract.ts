// What every adapter of `ProductCommands` must do. It holds no implementation: each adapter's
// `<adapter>.test.ts` runs it with its own layer, and with `readBack`, which looks into that adapter's storage
// (the port has no read: pages read through their own query ports). Development only exercises the in-memory
// adapter, so without a shared contract nothing would notice a production one that behaves differently.
import { describe, test } from 'bun:test'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import type * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as References from 'effect/References'
import * as fc from 'fast-check'
import * as ProductArbitrary from '#app/domain/product.test_arbitrary.ts'
import * as Product from '#app/domain/product.ts'
import * as ProductCommands from './product-commands.ts'

/** Runs `property` for generated values, each time on a fresh storage built by `adapter`. */
export const check = <A, E, R>(
  adapter: () => Layer.Layer<R>,
  arbitrary: fc.Arbitrary<A>,
  property: (a: A) => Effect.Effect<boolean, E, R>,
) =>
  fc.assert(
    fc.asyncProperty(arbitrary, (a) =>
      Effect.runPromise(
        // A request that is never completed hangs whoever waits on it: the timeout turns that into a failure.
        property(a).pipe(
          Effect.timeout('5 seconds'),
          Effect.provide(adapter()),
          Effect.orDie,
          // Every run builds a storage, which logs that it is ready: only warnings are worth showing.
          Effect.provideService(References.MinimumLogLevel, 'Warn'),
        ),
      )),
    { numRuns: 25 },
  )

export const add = (product: Product.Product) =>
  Effect.gen(function*() {
    const { add } = yield* ProductCommands.ProductCommands
    return yield* Effect.request(ProductCommands.AddProduct({ snapshot: Product.toSnapshot(product) }), add)
  })

export const deleteById = (id: string) =>
  Effect.gen(function*() {
    const { deleteById } = yield* ProductCommands.ProductCommands
    return yield* Effect.request(ProductCommands.DeleteProductById({ id }), deleteById)
  })

/** Reads what the adapter's storage holds under `id`, without going through the port. */
export type ReadBack<E, R> = (id: string) => Effect.Effect<Opt.Option<Product.UnvalidatedSnapshot>, E, R>

// Strings that a loose parser would read as a stored id (the first product gets id 1).
const unknownId = fc.oneof(
  fc.string(),
  fc.integer({ min: 1_000_000 }).map(String),
  fc.constantFrom('1 ', ' 1', '01', '1.0', '1e0', '+1'),
)

export const productCommandsContract = <E, R>(
  name: string,
  adapter: () => Layer.Layer<ProductCommands.ProductCommands | R>,
  readBack: ReadBack<E, R>,
) =>
  describe(`ProductCommands contract (${name})`, () => {
    const readsBackAs = (id: string, product: Product.Product) =>
      readBack(id).pipe(
        Effect.map((stored) => Opt.exists(stored, (s) => Equal.equals(Product.fromSnapshot(s), Opt.some(product)))),
      )
    const isStored = (id: string) => readBack(id).pipe(Effect.map(Opt.isSome))

    test('a product reads back as itself, under the id it was given', () =>
      check(adapter, ProductArbitrary.arbitrary, (product) =>
        Effect.gen(function*() {
          const id = yield* add(product)
          return yield* readsBackAs(id, product)
        })))

    test('products added together get distinct ids, and each reads back as itself', () =>
      check(
        adapter,
        fc.array(ProductArbitrary.arbitrary, { minLength: 1, maxLength: 6 }),
        (products) =>
          Effect.gen(function*() {
            const ids = yield* Effect.forEach(products, add, { concurrency: 'unbounded' })
            const readBack = yield* Effect.forEach(products, (product, index) => readsBackAs(ids[index] ?? '', product))
            return new Set(ids).size === ids.length && readBack.every(Boolean)
          }),
      ))

    test('deleting a product removes it, and only it', () =>
      check(
        adapter,
        fc.tuple(ProductArbitrary.arbitrary, ProductArbitrary.arbitrary),
        ([kept, deleted]) =>
          Effect.gen(function*() {
            const keptId = yield* add(kept)
            const deletedId = yield* add(deleted)
            yield* deleteById(deletedId)
            return !(yield* isStored(deletedId)) && (yield* readsBackAs(keptId, kept))
          }),
      ))

    test('deleting an id that is not stored completes and changes nothing', () =>
      check(
        adapter,
        fc.tuple(ProductArbitrary.arbitrary, unknownId),
        ([product, unknownId]) =>
          Effect.gen(function*() {
            const id = yield* add(product)
            // A storage may start with sample products: an id it holds is not a counterexample.
            if (yield* isStored(unknownId)) return true
            yield* deleteById(unknownId).pipe(Effect.ignore)
            return yield* readsBackAs(id, product)
          }),
      ))
  })
