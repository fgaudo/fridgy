import * as Arr from 'effect/Array'
import type * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as Result from 'effect/Result'
import * as SqlResolver from 'effect/sql/SqlResolver'
import * as ProductCommands from '../../ports/product-commands.ts'
import * as SqlHelper from '@/infra/sql/sql-helper.ts'
import * as Integer from '@/libs/numbers/integer.ts'

export const layer = Layer.effect(
  ProductCommands.ProductCommands,
  Effect.gen(function*() {
    const { productRepository, insertProductWithExpirationResolver } = yield* SqlHelper.SqlHelper
    const add = RequestResolver.makeGrouped<
      ProductCommands.AddProduct,
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
    const deleteById = RequestResolver.make<ProductCommands.DeleteProductById>(
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
    return { add, deleteById }
  }),
)
