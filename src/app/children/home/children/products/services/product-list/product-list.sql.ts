import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import * as SqlClient from 'effect/sql/SqlClient'
import { ProductStore } from '#infrastructure/storage/products.ts'
import { ProductExpirationSchema, ProductSchema } from '#infrastructure/storage/schema.ts'
import * as Source from '#libs/source/source.ts'
import { ProductList, ProductListReadError, type StoredProducts } from './product-list.ts'

export const layer = Layer.effect(
  ProductList,
  Effect.gen(function*() {
    const { readAll } = yield* ProductStore
    const sql = yield* SqlClient.SqlClient
    const changes = Source.fromStream(
      sql.reactive(
        [ProductSchema.table, ProductExpirationSchema.table],
        readAll.pipe(
          Effect.tapError((error) => Effect.logWarning('Could not read the products', error)),
          Effect.result,
        ),
      ).pipe(
        Stream.buffer({ capacity: 1, strategy: 'sliding' }),
        Stream.map((result): StoredProducts =>
          Result.match(result, {
            onFailure: (cause) => Result.fail(new ProductListReadError({ cause })),
            onSuccess: (products) =>
              Result.succeed(
                Arr.map(products, (product) => ({
                  ...product,
                  maybeId: Opt.map(product.maybeId, (id) => id.toString(10)),
                })),
              ),
          })
        ),
      ),
    )
    return { changes }
  }),
).pipe(Layer.provide(ProductStore.layer))
