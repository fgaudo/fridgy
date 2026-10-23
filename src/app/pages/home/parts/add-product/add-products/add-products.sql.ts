import type * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as SqlResolver from 'effect/sql/SqlResolver'
import * as AddProducts from './add-products.ts'
import * as SqlHelper from '#infrastructure/sql/sql-helper.ts'

export const layer = Layer.effect(
  AddProducts.AddProducts,
  Effect.gen(function*() {
    const { productRepository, insertProductWithExpirationResolver } = yield* SqlHelper.SqlHelper
    const add = RequestResolver.makeGrouped<
      AddProducts.AddProduct,
      Opt.Option<DateTime.Utc>
    >({
      key: (entry) => entry.request.snapshot.maybeExpirationDate,
      resolver: Effect.fn(function*(entries, maybeExpirationDate) {
        const maybeProducts = yield* pipe(
          entries,
          Opt.isNone(maybeExpirationDate)
            ? Effect.forEach((entry) =>
              productRepository.insert({
                creation_date: entry.request.snapshot.creationDate,
                name: entry.request.snapshot.name,
              })
            )
            : Effect.forEach((entry) =>
              SqlResolver.request({
                creationDate: entry.request.snapshot.creationDate,
                expirationDate: maybeExpirationDate.value,
                name: entry.request.snapshot.name,
              }, insertProductWithExpirationResolver)
            ),
          // The requests only learn that they failed: the cause is logged here, where it is known.
          Effect.tapError((error) => Effect.logWarning('Could not insert products', error)),
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
    return { add }
  }),
).pipe(Layer.provide(SqlHelper.SqlHelper.layer))
