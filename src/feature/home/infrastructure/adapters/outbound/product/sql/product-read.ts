import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { flow, pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import * as SqlClient from 'effect/unstable/sql/SqlClient'
import { ProductExpirationSchema, ProductSchema } from '@/infra/shared/sql/schema.ts'
import * as SqlHelper from '@/infra/shared/sql/sql-helper.ts'
import * as ProductRead from '../../../../../application/outbound/product/products-read'

const mapToDto = Effect.fn(
  function*(product: Effect.Success<SqlHelper.SqlHelper['Service']['getProducts']>[0]) {
    return {
      ...product,
      maybeId: Opt.map(product.maybeId, (id) => id.toString(10)),
    } as const
  },
)

export const layer = Layer.effect(
  ProductRead.ProductsRead,
  Effect.gen(function*() {
    const { getProducts } = yield* SqlHelper.SqlHelper
    const sql = yield* SqlClient.SqlClient
    const reactive = sql.reactive(
      [ProductSchema.table, ProductExpirationSchema.table],
      getProducts.pipe(Effect.option),
    )
    return {
      change$: reactive.pipe(
        Stream.buffer({ capacity: 1, strategy: 'sliding' }),
        Stream.mapEffect(Effect.fn(function*(maybeProducts) {
          if (Opt.isNone(maybeProducts)) {
            return Result.fail(undefined)
          }
          return yield* pipe(maybeProducts.value, Arr.map(mapToDto), Effect.all, Effect.result)
        })),
      ),
      get: Effect.gen(function*() {
        const maybeProducts = yield* Effect.option(getProducts)
        if (Opt.isNone(maybeProducts)) {
          return yield* Effect.fail(undefined)
        }
        return yield* pipe(maybeProducts.value, Arr.map(mapToDto), Effect.all)
      }),
    }
  }),
)
