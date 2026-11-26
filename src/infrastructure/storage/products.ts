// The stored products, as the programs' commands and subscriptions ask for them: the list and its changes, and the
// writes. How each column is encoded, the tables as models and a product's row joined to its expiration stay here.
import * as Arr from 'effect/Array'
import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Predicate from 'effect/Predicate'
import * as Result from 'effect/Result'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'
import * as SchemaX from 'effect/schema'
import * as Sql from 'effect/sql'
import * as SqlSchema from 'effect/sql/SqlSchema'
import type * as Domain from '#domain/product.ts'
import * as Day from '#libs/dates/day.ts'
import * as Integer from '#libs/numbers/integer.ts'
import * as Source from '#libs/source/source.ts'
import { ProductExpirationSchema, ProductSchema } from './schema.ts'

/** A stored product under its id, still unvalidated: storage may contain anything, and every row has an id. */
export type StoredProduct = Domain.UnvalidatedSnapshot & Readonly<{ id: Domain.ProductId }>

/** The storage could not be read: the list stays as it was until the next change. */
export class ProductsReadError extends Data.TaggedError('ProductsReadError')<{ readonly cause: unknown }> {}

/** The storage could not be written: nothing of the write is stored. */
export class ProductsWriteError extends Data.TaggedError('ProductsWriteError')<{ readonly cause: unknown }> {}

/** Nothing is stored under the id: the product was deleted since it was read. */
export class ProductNotStored extends Data.TaggedError('ProductNotStored')<{ readonly id: Domain.ProductId }> {}

export type StoredProducts = Result.Result<ReadonlyArray<StoredProduct>, ProductsReadError>

/** A product's id is its row's: the app makes one only by decoding a row. */
const ProductIdColumn = Schema.Int.pipe(Schema.brand('ProductId'))

/** How the values of each column are encoded: what a query decodes its rows with. */
const ProductColumns = {
  id: ProductIdColumn,
  name: Schema.String,
  creationDate: Schema.DateTimeUtcFromString,
} as const

const ProductExpirationColumns = {
  id: Integer.Schema,
  date: Day.Schema,
  productId: ProductIdColumn,
} as const

/**
 * A product's row as the list selects it. The id is the rowid, always there. The other columns are read one by one
 * (`readRow`), so that one that cannot be read leaves the others, and the other rows.
 */
const Row = Schema.Struct({
  id: ProductColumns.id,
  name: Schema.Unknown,
  creationDate: Schema.Unknown,
  expirationDate: Schema.Unknown,
})

const readName = Schema.decodeUnknownOption(ProductColumns.name)
const readCreationDate = Schema.decodeUnknownOption(ProductColumns.creationDate)
const readExpirationDate = Schema.decodeUnknownOption(ProductExpirationColumns.date)

/** What a row holds. A missing expiration is a product that never expires: the schema stores no `NULL` date. */
const readRow = (row: typeof Row.Type): StoredProduct => ({
  id: row.id,
  maybeName: readName(row.name),
  maybeCreationDate: readCreationDate(row.creationDate),
  maybeExpirationDate: Predicate.isNullish(row.expirationDate)
    ? Opt.some(Opt.none())
    : Opt.map(readExpirationDate(row.expirationDate), Opt.some),
})

class Product extends SchemaX.Model.Class<Product>('Product')({
  [ProductSchema.columns.id]: SchemaX.Model.Field({
    select: ProductColumns.id,
    update: ProductColumns.id,
    json: ProductColumns.id,
  }),
  [ProductSchema.columns.name]: ProductColumns.name,
  [ProductSchema.columns.creationDate]: ProductColumns.creationDate,
}) {}

class ProductExpiration extends SchemaX.Model.Class<ProductExpiration>(
  'ProductExpiration',
)({
  [ProductExpirationSchema.columns.id]: SchemaX.Model.Field({
    select: ProductExpirationColumns.id,
    update: ProductExpirationColumns.id,
    json: ProductExpirationColumns.id,
  }),
  [ProductExpirationSchema.columns.date]: ProductExpirationColumns.date,
  [ProductExpirationSchema.columns.productId]: ProductExpirationColumns.productId,
}) {}

const toWriteError = (cause: unknown) => new ProductsWriteError({ cause })

export class ProductStore extends Context.Service<ProductStore>()(
  'c28d89da81ef74f7',
  {
    make: Effect.gen(function*() {
      const sql = yield* Sql.SqlClient.SqlClient
      const repository = yield* Sql.SqlModel.makeRepository(
        Product,
        {
          idColumn: ProductSchema.columns.id,
          spanPrefix: 'ProductRepository',
          tableName: ProductSchema.table,
        } as const,
      )
      const expirations = yield* Sql.SqlModel.makeRepository(
        ProductExpiration,
        {
          idColumn: ProductExpirationSchema.columns.id,
          spanPrefix: 'ProductExpirationRepository',
          tableName: ProductExpirationSchema.table,
        } as const,
      )
      const { table: product_table, columns: product } = ProductSchema
      const { table: expiration_table, columns: expiration } = ProductExpirationSchema
      const id = sql(`${product_table}.${product.id}`)
      const name = sql(`${product_table}.${product.name}`)
      const creationDate = sql(`${product_table}.${product.creationDate}`)
      const expirationDate = sql(`${expiration_table}.${expiration.date}`)
      const productId = sql(`${expiration_table}.${expiration.productId}`)
      /**
       * Every stored product, left-joined to its expiration: those that expire first, the soonest first. The id
       * breaks ties, since SQLite keeps no order among equal keys and the rows would move between reads.
       */
      const readAll = SqlSchema.findAll({
        Request: Schema.Void,
        Result: Row,
        execute: () =>
          sql`
            SELECT ${id} AS id, ${name} AS name, ${creationDate} AS creationDate, ${expirationDate} AS expirationDate
            FROM ${sql(product_table)} LEFT JOIN ${sql(expiration_table)} ON ${id} = ${productId}
            ORDER BY ${expirationDate} IS NULL, ${expirationDate}, ${id}
          `,
      })()
      /**
       * Event: emits the list on subscription and after every change to the stored products, or why it could not
       * be read; it never ends, a failed read included. A list is skipped while the reader is busy with the last.
       */
      const changes: Source.Source<StoredProducts, never> = Source.fromStream(
        sql.reactive(
          [product_table, expiration_table],
          readAll.pipe(
            Effect.tapError((error) => Effect.logWarning('Could not read the products', error)),
            Effect.result,
          ),
        ).pipe(
          Stream.buffer({ capacity: 1, strategy: 'sliding' }),
          Stream.map((result): StoredProducts =>
            Result.match(result, {
              onFailure: (cause) => Result.fail(new ProductsReadError({ cause })),
              onSuccess: (rows) => Result.succeed(Arr.map(rows, readRow)),
            })
          ),
        ),
      )
      const insertOne = Effect.fnUntraced(function*(snapshot: Domain.Snapshot) {
        const stored = yield* repository.insert({ creation_date: snapshot.creationDate, name: snapshot.name })
        yield* Opt.match(snapshot.maybeExpirationDate, {
          onNone: () => Effect.void,
          onSome: (date) => Effect.asVoid(expirations.insert({ date, product_id: stored.id })),
        })
        return stored.id
      })
      /** Stores products, each with its expiration if it has one, all or nothing; answers with their ids, in order. */
      const insertAll = Effect.fn('ProductStore.insertAll')(
        function*(snapshots: Iterable<Domain.Snapshot>) {
          return yield* Effect.forEach(snapshots, insertOne)
        },
        sql.withTransaction,
        Effect.mapError(toWriteError),
      )
      /**
       * Deletes products, all or nothing: a selection deleted in part would leave the user to guess which products
       * are gone. A product deleted already has nothing to delete. The schema's trigger deletes each expiration with
       * its product (`migrations.ts`).
       */
      const deleteAll = Effect.fn('ProductStore.deleteAll')(
        function*(ids: Iterable<Domain.ProductId>) {
          yield* Effect.forEach(ids, repository.delete, { discard: true })
        },
        sql.withTransaction,
        Effect.mapError(toWriteError),
      )
      const updateRow = SqlSchema.findOneOption({
        Request: Schema.Struct({
          id: ProductColumns.id,
          name: ProductColumns.name,
          creationDate: ProductColumns.creationDate,
        }),
        Result: Schema.Struct({ id: ProductColumns.id }),
        execute: (request) =>
          sql`
            UPDATE ${sql(product_table)}
            SET ${sql(product.name)} = ${request.name}, ${sql(product.creationDate)} = ${request.creationDate}
            WHERE ${sql(product.id)} = ${request.id}
            RETURNING ${sql(product.id)} AS id
          `,
      })
      // `product_id` is unique (`migrations.ts`): a product has one expiration at most.
      const upsertExpiration = SqlSchema.void({
        Request: Schema.Struct({ productId: ProductExpirationColumns.productId, date: ProductExpirationColumns.date }),
        execute: (request) => {
          const [date, productId] = [sql(expiration.date), sql(expiration.productId)]
          return sql`
            INSERT INTO ${sql(expiration_table)} (${date}, ${productId}) VALUES (${request.date}, ${request.productId})
            ON CONFLICT (${productId}) DO UPDATE SET ${date} = excluded.${date}
          `
        },
      })
      const deleteExpiration = SqlSchema.void({
        Request: ProductExpirationColumns.productId,
        execute: (productId) =>
          sql`DELETE FROM ${sql(expiration_table)} WHERE ${sql(expiration.productId)} = ${productId}`,
      })
      /**
       * The product and its expiration, written in one transaction; `None` when nothing is stored under `id`. Not
       * the repository's `update`, which makes a missing row a defect: a product deleted since it was read is a
       * state of the world.
       */
      const write = Effect.fnUntraced(
        function*(id: Domain.ProductId, snapshot: Domain.Snapshot) {
          const maybeUpdated = yield* updateRow({ id, name: snapshot.name, creationDate: snapshot.creationDate })
          if (Opt.isNone(maybeUpdated)) return Opt.none<void>()
          yield* Opt.match(snapshot.maybeExpirationDate, {
            onNone: () => deleteExpiration(id),
            onSome: (date) => upsertExpiration({ productId: id, date }),
          })
          return Opt.some<void>(undefined)
        },
        sql.withTransaction,
        Effect.mapError(toWriteError),
      )
      /** Writes a product under `id` in place of what was there, its expiration added, changed or removed with it. */
      const update = Effect.fn('ProductStore.update')(
        function*(id: Domain.ProductId, snapshot: Domain.Snapshot) {
          const maybeUpdated = yield* write(id, snapshot)
          if (Opt.isNone(maybeUpdated)) return yield* new ProductNotStored({ id })
        },
      )
      return { changes, insertAll, deleteAll, update }
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
