// How Open Food Facts' answers are cached, for every adapter of the storage: one row per normalized barcode, as
// the server gave it. What a row means for a lookup, how long it is trusted, is the adapter's own.
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'
import * as Sql from 'effect/sql'
import * as SqlSchema from 'effect/sql/SqlSchema'
import { BarcodeLookupSchema } from './schema.ts'

const nullable = <S extends Schema.Constraint>(schema: S) =>
  Schema.OptionFromNullishOr(schema, { onNoneEncoding: null })

/** A cached answer: `maybeName`, `maybeBrands`, `maybeQuantity` and `maybeLanguage` are none unless found. */
export const Row = Schema.Struct({
  barcode: Schema.String,
  status: Schema.Literals(['found', 'not_found']),
  maybeName: nullable(Schema.String),
  maybeBrands: nullable(Schema.String),
  maybeQuantity: nullable(Schema.String),
  maybeLanguage: nullable(Schema.String),
  lookedUpAt: Schema.DateTimeUtcFromString,
})

export type Row = typeof Row.Type

const encode = Schema.encodeEffect(Row)

export class BarcodeCache extends Context.Service<BarcodeCache>()(
  '4f17821129272429',
  {
    make: Effect.gen(function*() {
      const sql = yield* Sql.SqlClient.SqlClient
      const { table, columns } = BarcodeLookupSchema
      /** The answer cached for a normalized `barcode`, if any. */
      const read = SqlSchema.findOneOption({
        Request: Schema.String,
        Result: Row,
        execute: (barcode) =>
          sql`
            SELECT
              ${sql(columns.barcode)} AS barcode,
              ${sql(columns.status)} AS status,
              ${sql(columns.name)} AS maybeName,
              ${sql(columns.brands)} AS maybeBrands,
              ${sql(columns.quantity)} AS maybeQuantity,
              ${sql(columns.language)} AS maybeLanguage,
              ${sql(columns.lookedUpAt)} AS lookedUpAt
            FROM ${sql(table)}
            WHERE ${sql(columns.barcode)} = ${barcode}
          `,
      })
      /** Caches `row` in place of what was cached for its barcode, every column included. */
      const write = Effect.fnUntraced(function*(row: Row) {
        const encoded = yield* encode(row)
        yield* sql`
          INSERT INTO ${sql(table)} (
            ${sql(columns.barcode)}, ${sql(columns.status)}, ${sql(columns.name)}, ${sql(columns.brands)},
            ${sql(columns.quantity)}, ${sql(columns.language)}, ${sql(columns.lookedUpAt)}
          ) VALUES (
            ${encoded.barcode}, ${encoded.status}, ${encoded.maybeName}, ${encoded.maybeBrands},
            ${encoded.maybeQuantity}, ${encoded.maybeLanguage}, ${encoded.lookedUpAt}
          )
          ON CONFLICT (${sql(columns.barcode)}) DO UPDATE SET
            ${sql(columns.status)} = excluded.${sql(columns.status)},
            ${sql(columns.name)} = excluded.${sql(columns.name)},
            ${sql(columns.brands)} = excluded.${sql(columns.brands)},
            ${sql(columns.quantity)} = excluded.${sql(columns.quantity)},
            ${sql(columns.language)} = excluded.${sql(columns.language)},
            ${sql(columns.lookedUpAt)} = excluded.${sql(columns.lookedUpAt)}
        `
      })
      /** The cache's table, for a query that reacts to its changes. */
      const tables = [table]
      return { read, write, tables }
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
