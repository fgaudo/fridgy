import * as Arr from 'effect/Array'
import type * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import * as SqlClient from 'effect/sql/SqlClient'
import * as SqlResolver from 'effect/sql/SqlResolver'
import * as Products from '../../ports/products.ts'
import { ProductExpirationSchema, ProductSchema } from '@/infra/sql/schema.ts'
import * as SqlHelper from '@/infra/sql/sql-helper.ts'
import * as Integer from '@/libs/numbers/integer.ts'

export const layer = Layer.effect(
  Products.Products,
  Effect.gen(function*() {
    const {
      productRepository,
      insertProductWithExpirationResolver,
      getProducts,
    } = yield* SqlHelper.SqlHelper
    const sql = yield* SqlClient.SqlClient

    const add = RequestResolver.makeGrouped<
      Products.AddProduct,
      Opt.Option<DateTime.Utc>
    >({
      key: (entry) => entry.request.product.maybeExpirationDate,
      resolver: Effect.fn(function*(entries, maybeExpirationDate) {
        const maybeProducts = yield* pipe(
          entries,
          Opt.isNone(maybeExpirationDate)
            ? Effect.forEach((entry) =>
              productRepository.insert({
                creation_date: entry.request.product.creationDate,
                name: entry.request.product.name,
              })
            )
            : Effect.forEach((entry) =>
              SqlResolver.request({
                creationDate: entry.request.product.creationDate,
                expirationDate: maybeExpirationDate.value,
                name: entry.request.product.name,
              }, insertProductWithExpirationResolver)
            ),
          Effect.option,
        )
        if (Opt.isNone(maybeProducts)) {
          return yield* Effect.forEach(entries, Request.fail(undefined))
        }
        return yield* Effect.forEach(
          entries,
          (entry, index) =>
            Request.succeed(
              entry,
              maybeProducts.value[index]!.id.toString(10),
            ),
        )
      }),
    })

    const deleteById = RequestResolver.make<Products.DeleteProductById>(
      Effect.fn(function*(entries) {
        const [validEntries, invalidEntries] = Arr.partition(entries, (entry) =>
          pipe(
            Number.parseInt(entry.request.id, 10),
            Integer.fromNumber,
            Opt.match({
              onNone: () => Result.fail(entry),
              onSome: (id) => Result.succeed([entry, id] as const),
            }),
          ))
        // Every request must be completed, including the ones we cannot run.
        yield* Effect.forEach(invalidEntries, Request.fail(undefined))
        const maybeIds = yield* pipe(
          validEntries,
          Effect.forEach(([, id]) => productRepository.delete(id)),
          Effect.option,
        )
        return yield* Effect.forEach(
          validEntries,
          ([entry]) =>
            Opt.isNone(maybeIds)
              ? Request.fail(entry, undefined)
              : Request.succeed(entry, undefined),
        )
      }),
    )

    const changes = sql.reactive(
      [ProductSchema.table, ProductExpirationSchema.table],
      getProducts.pipe(Effect.option),
    ).pipe(
      Stream.buffer({ capacity: 1, strategy: 'sliding' }),
      Stream.map((maybeProducts): Products.Snapshot =>
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
    )

    return { add, deleteById, changes }
  }),
)
