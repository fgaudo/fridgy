import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as Result from 'effect/Result'
import * as DeleteProducts from './delete-products.ts'
import * as SqlHelper from '#infrastructure/sql/sql-helper.ts'
import * as Integer from '#libs/numbers/integer.ts'

export const layer = Layer.effect(
  DeleteProducts.DeleteProducts,
  Effect.gen(function*() {
    const { productRepository } = yield* SqlHelper.SqlHelper
    const deleteById = RequestResolver.make<DeleteProducts.DeleteProductById>(
      Effect.fn(function*(entries) {
        const [validEntries, invalidEntries] = Arr.partition(entries, (entry) =>
          pipe(
            Number(entry.request.id),
            Integer.make,
            // Only the form ids are written in: `parseInt` would read "1 " or "1abc" as 1.
            Opt.filter((id) => id.toString(10) === entry.request.id),
            Opt.match({
              onNone: () => Result.fail(entry),
              onSome: (id) => Result.succeed([entry, id] as const),
            }),
          ))
        // Every request must be completed, including the ones we cannot run.
        if (Arr.isArrayNonEmpty(invalidEntries)) {
          yield* Effect.logDebug('Not deleting ids that were never written', invalidEntries.map((e) => e.request.id))
        }
        yield* Effect.forEach(invalidEntries, Request.fail(undefined))
        const maybeIds = yield* pipe(
          validEntries,
          Effect.forEach(([, id]) => productRepository.delete(id)),
          Effect.tapError((error) => Effect.logWarning('Could not delete products', error)),
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
    return { deleteById }
  }),
).pipe(Layer.provide(SqlHelper.SqlHelper.layer))
