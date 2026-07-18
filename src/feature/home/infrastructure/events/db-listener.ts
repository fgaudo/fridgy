import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'

import * as SqlClient from 'effect/unstable/sql/SqlClient'
import { Message } from '@/feature/home/application/messages.ts'
import { ProductExpirationSchema, ProductSchema } from '@/infra/sql/schema.ts'
import * as SqlHelper from '@/infra/sql/sql-helper.ts'

const mapToDto = Effect.fn(
  function*(product: Effect.Success<SqlHelper.SqlHelper['Service']['getProducts']>[0]) {
    return {
      ...product,
      maybeId: Opt.map(product.maybeId, (id) => id.toString(10)),
    } as const
  },
)

export const db = Effect.gen(function*() {
  const { getProducts } = yield* SqlHelper.SqlHelper
  const sql = yield* SqlClient.SqlClient
  const reactive = sql.reactive(
    [ProductSchema.table, ProductExpirationSchema.table],
    getProducts.pipe(Effect.option),
  )
  return reactive.pipe(
    Stream.buffer({ capacity: 1, strategy: 'sliding' }),
    Stream.mapEffect(Effect.fn(function*(maybeProducts) {
      if (Opt.isNone(maybeProducts)) {
        return Message.ProductsChanged({ result: Result.fail(undefined) })
      }
      return yield* pipe(
        maybeProducts.value,
        Arr.map(mapToDto),
        Effect.all,
        Effect.result,
        Effect.map(
          Result.match({
            onFailure: () => Message.ProductsChanged({ result: Result.fail(undefined) }),
            onSuccess: (result) => Message.ProductsChanged({ result: Result.succeed(result) }),
          }),
        ),
      )
    })),
  )
})
