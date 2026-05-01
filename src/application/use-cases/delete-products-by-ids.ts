import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Result from 'effect/Result'
import * as DeleteProductById from '@/app/ports/outbound/product/delete-product-by-id.ts'
import type * as NonEmptyHashSet from '@/shared/non-empty-hash-set.ts'

export type Params<Msg> = {
  ids: NonEmptyHashSet.NonEmptyHashSet<string>
  mapper: (r: Response) => Msg
}

export type Response = Result.Result<void, void>

export class DeleteProductsByIds extends Context.Service<DeleteProductsByIds>()(
  'a192cfdd6138960a',
  {
    make: Effect.gen(function*() {
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
          return Result.fail(undefined)
        }
        yield* Effect.logInfo('Products deleted')
        return Result.succeed(undefined)
      }, Effect.withLogSpan('DeleteAndGetProducts'))
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
