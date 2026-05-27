import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import { DeleteProductsByIds } from '../../feature/home/application/ports/inbound/delete-products-by-ids'
import * as DeleteProductById from '../../feature/home/application/ports/outbound/product/delete-product-by-id'
import type * as NonEmptyHashSet from '@/shared/non-empty-hash-set.ts'

export const layer = Layer.effect(
  DeleteProductsByIds,
  Effect.gen(function*() {
    const resolver = yield* DeleteProductById.DeleteProductById
    return Effect.fn(function*({
      ids,
    }: {
      ids: NonEmptyHashSet.NonEmptyHashSet<string>
    }) {
      yield* Effect.logInfo('Requested to delete products')
      yield* Effect.logInfo('Attempting to delete products...')
      const maybeDeleteResults = yield* pipe(
        ids,
        HashSet.map((id) =>
          DeleteProductById.Request({
            id,
          })
        ),
        Effect.forEach(Effect.request(resolver), {
          concurrency: 'unbounded',
        }),
        Effect.option,
      )
      if (Option.isNone(maybeDeleteResults)) {
        return yield* Effect.fail(undefined)
      }
      yield* Effect.logInfo('Products deleted')
    }, Effect.withLogSpan('DeleteAndGetProducts'))
  }),
)
