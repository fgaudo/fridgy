import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Source from '#libs/source/source.ts'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import * as SqlClient from 'effect/sql/SqlClient'
import { ProductList, type StoredProducts } from '../../ports/product-list.ts'
import { ProductExpirationSchema, ProductSchema } from '#infrastructure/sql/schema.ts'
import * as SqlHelper from '#infrastructure/sql/sql-helper.ts'

export const layer = Layer.effect(
  ProductList,
  Effect.gen(function*() {
    const { getProducts } = yield* SqlHelper.SqlHelper
    const sql = yield* SqlClient.SqlClient
    const changes = Source.fromStream(
      sql.reactive(
        [ProductSchema.table, ProductExpirationSchema.table],
        getProducts.pipe(
          Effect.tapError((error) => Effect.logWarning('Could not read the products', error)),
          Effect.option,
        ),
      ).pipe(
        Stream.buffer({ capacity: 1, strategy: 'sliding' }),
        Stream.map((maybeProducts): StoredProducts =>
          Opt.match(maybeProducts, {
            onNone: () => Result.fail(undefined),
            onSome: (products) =>
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
)
