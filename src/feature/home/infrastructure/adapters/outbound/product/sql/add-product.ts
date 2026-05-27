import type * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as SqlResolver from 'effect/unstable/sql/SqlResolver'
import * as AddProduct from '../../../../../application/ports/outbound/product/add-product'
import * as SqlHelper from '@/infra/shared/sql/sql-helper.ts'

export const addProductLayer = Layer.effect(
  AddProduct.AddProduct,
  Effect.gen(function*() {
    const { productRepository, insertProductWithExpirationResolver } = yield* SqlHelper.SqlHelper
    return RequestResolver.makeGrouped<
      AddProduct.Request,
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
  }),
)
