// What every adapter of `AddProducts` must do. It holds no implementation: each adapter's
// `<port>.<backing>.test.ts` runs it with its own layer, and with `readBack`, which looks into that adapter's
// storage (the port has no read: the page reads through its own query ports).
import { describe, test } from 'bun:test'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import type * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as ProductArbitrary from '#domain/product.test_arbitrary.ts'
import * as Product from '#domain/product.ts'
import { checkOnFreshLayer } from '#libs/testing/fresh-layer.test_support.ts'
import * as AddProducts from './add-products.ts'

const add = Effect.fnUntraced(function*(product: Product.Product) {
  const { add } = yield* AddProducts.AddProducts
  return yield* Effect.request(AddProducts.AddProduct({ snapshot: Product.toSnapshot(product) }), add)
})

/** Reads what the adapter's storage holds under `id`, without going through the port. */
export type ReadBack<R> = (id: string) => Effect.Effect<Opt.Option<Product.UnvalidatedSnapshot>, never, R>

export const addProductsContract = <R>(
  name: string,
  adapter: () => Layer.Layer<AddProducts.AddProducts | R>,
  readBack: ReadBack<R>,
) =>
  describe(`AddProducts contract (${name})`, () => {
    const readsBackAs = (id: string, product: Product.Product) =>
      readBack(id).pipe(
        Effect.map((stored) => Opt.exists(stored, (s) => Equal.equals(Product.fromSnapshot(s), Opt.some(product)))),
      )

    test('a product reads back as itself, under the id it was given', () =>
      checkOnFreshLayer(
        adapter,
        ProductArbitrary.arbitrary,
        Effect.fnUntraced(function*(product) {
          const id = yield* add(product)
          return yield* readsBackAs(id, product)
        }),
      ))

    test('products added together get distinct ids, and each reads back as itself', () =>
      checkOnFreshLayer(
        adapter,
        fc.array(ProductArbitrary.arbitrary, { minLength: 1, maxLength: 6 }),
        Effect.fnUntraced(function*(products) {
          const ids = yield* Effect.forEach(products, add, { concurrency: 'unbounded' })
          const readBack = yield* Effect.forEach(products, (product, index) => readsBackAs(ids[index] ?? '', product))
          return new Set(ids).size === ids.length && readBack.every(Boolean)
        }),
      ))
  })
