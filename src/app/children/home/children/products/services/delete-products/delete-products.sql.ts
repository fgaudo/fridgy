import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as Result from 'effect/Result'
import * as SqlClient from 'effect/sql/SqlClient'
import { ProductStore } from '#infrastructure/storage/products.ts'
import * as Integer from '#libs/numbers/integer.ts'
import * as DeleteProducts from './delete-products.ts'

export const layer = Layer.effect(
  DeleteProducts.DeleteProducts,
  Effect.gen(function*() {
    const { repository } = yield* ProductStore
    const sql = yield* SqlClient.SqlClient
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
        if (Arr.isArrayNonEmpty(invalidEntries)) {
          yield* Effect.logDebug('Not deleting ids that were never written', invalidEntries.map((e) => e.request.id))
        }
        // All or nothing: a selection deleted in part would leave the user to guess which products are gone.
        const outcome = Arr.isArrayNonEmpty(validEntries)
          ? yield* pipe(
            validEntries,
            Effect.forEach(([, id]) => repository.delete(id), { discard: true }),
            sql.withTransaction,
            Effect.tapError((error) => Effect.logWarning('Could not delete products', error)),
            Effect.result,
          )
          : Result.succeed(undefined)
        // Every request must be completed, including the ones that could not run: only once the transaction is
        // over, or whoever waits on them would query the connection while it is in the transaction.
        yield* Effect.forEach(invalidEntries, Request.fail(undefined))
        return yield* Effect.forEach(
          validEntries,
          ([entry]) =>
            Result.isFailure(outcome)
              ? Request.fail(entry, undefined)
              : Request.succeed(entry, undefined),
        )
      }),
    )
    return { deleteById }
  }),
).pipe(Layer.provide(ProductStore.layer))
