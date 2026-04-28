import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'

import * as DeleteProductById from '@/app/ports/outbound/product/delete-product-by-id.ts'

import * as SqlHelper from '@/infra/shared/sql/sql-helper.ts'
import * as Integer from '@/shared/integer/integer.ts'

export const deleteProductsLayer = Layer.effect(
  DeleteProductById.DeleteProductById,
  Effect.gen(function*() {
    const { productRepository } = yield* SqlHelper.SqlHelper
    return RequestResolver.make<DeleteProductById.Request>(Effect.fn(function*(entries) {
      const validEntries = pipe(
        entries,
        Arr.map((entry) =>
          pipe(Number.parseInt(entry.request.id, 10), Integer.fromNumber, Opt.map((id) => [entry, id] as const))
        ),
        Arr.filter((maybeEntry) => Opt.isSome(maybeEntry)),
      )
      const maybeIds = yield* pipe(
        validEntries,
        Effect.forEach((maybeEntry) => productRepository.delete(maybeEntry.value[1])),
        Effect.option,
      )
      if (Opt.isNone(maybeIds)) {
        return yield* Effect.forEach(validEntries, (entry) => Request.fail(entry.value[0], undefined))
      }
      return yield* Effect.forEach(validEntries, (entry) => Request.succeed(entry.value[0], undefined))
    }))
  }),
)
