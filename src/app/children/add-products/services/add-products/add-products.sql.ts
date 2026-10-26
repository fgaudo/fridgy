import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as Result from 'effect/Result'
import * as SqlClient from 'effect/sql/SqlClient'
import * as SqlResolver from 'effect/sql/SqlResolver'
import { ProductStore } from '#infrastructure/storage/products.ts'
import * as AddProducts from './add-products.ts'

export const layer = Layer.effect(
  AddProducts.AddProducts,
  Effect.gen(function*() {
    const { repository, insertWithExpiration } = yield* ProductStore
    const sql = yield* SqlClient.SqlClient
    const add = RequestResolver.make<AddProducts.AddProduct>(
      Effect.fn(function*(entries) {
        // All or nothing. The requests only learn that they failed: the cause is logged here, where it is known.
        const outcome = yield* pipe(
          entries,
          Effect.forEach(({ request: { snapshot } }) =>
            Opt.match(snapshot.maybeExpirationDate, {
              onNone: () => repository.insert({ creation_date: snapshot.creationDate, name: snapshot.name }),
              onSome: (expirationDate) =>
                SqlResolver.request(
                  { creationDate: snapshot.creationDate, expirationDate, name: snapshot.name },
                  insertWithExpiration,
                ),
            })
          ),
          sql.withTransaction,
          Effect.tapError((error) => Effect.logWarning('Could not insert products', error)),
          Effect.result,
        )
        return yield* Effect.forEach(
          entries,
          (entry, index) =>
            Opt.match(Opt.flatMap(Result.getSuccess(outcome), (inserted) => Opt.fromNullishOr(inserted[index])), {
              onNone: () => Request.fail(entry, undefined),
              onSome: ({ id }) => Request.succeed(entry, id.toString(10)),
            }),
        )
      }),
    )
    return { add }
  }),
).pipe(Layer.provide(ProductStore.layer))
