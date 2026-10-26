// The stored products, reached without a service: the adapters' tests use them to set up and check their
// service's contract, so that no service carries reads or writes that only tests need.
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as SqlResolver from 'effect/sql/SqlResolver'
import type * as Product from '#domain/product.ts'
import * as Integer from '#libs/numbers/integer.ts'
import { ProductStore } from './products.ts'

/** Stores a product, answering with its id. */
export const insert = Effect.fnUntraced(function*(snapshot: Product.Snapshot) {
  const { repository, insertWithExpiration } = yield* ProductStore
  const { id } = yield* Opt.match(snapshot.maybeExpirationDate, {
    onNone: () => repository.insert({ name: snapshot.name, creation_date: snapshot.creationDate }),
    onSome: (expirationDate) =>
      SqlResolver.request(
        { name: snapshot.name, creationDate: snapshot.creationDate, expirationDate },
        insertWithExpiration,
      ),
  }).pipe(Effect.orDie)
  return id.toString(10)
})

/** Removes the product stored under an id that `insert` gave. */
export const remove = (id: string) =>
  ProductStore.use(({ repository }) => repository.delete(Integer.makeUnsafe(Number(id)))).pipe(Effect.orDie)

/** What is stored under `id`, as the database holds it. */
export const readBack = (id: string): Effect.Effect<Opt.Option<Product.UnvalidatedSnapshot>, never, ProductStore> =>
  ProductStore.use(({ readAll }) => readAll).pipe(
    Effect.orDie,
    Effect.map((rows) =>
      Opt.map(Arr.findFirst(rows, (row) => Opt.contains(Opt.map(row.maybeId, String), id)), (row) => ({
        maybeName: row.maybeName,
        maybeCreationDate: row.maybeCreationDate,
        maybeExpirationDate: row.maybeExpirationDate,
      }))
    ),
  )
