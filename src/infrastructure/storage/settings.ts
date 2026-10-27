// How the user's settings are read and written, for every adapter of the storage: a text under a name. What a
// setting means, and what its text stands for, is its adapter's own.
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as Sql from 'effect/sql'
import * as SqlSchema from 'effect/sql/SqlSchema'
import { SettingSchema } from './schema.ts'

export class SettingStore extends Context.Service<SettingStore>()(
  '80ac6c625fddba8c',
  {
    make: Effect.gen(function*() {
      const sql = yield* Sql.SqlClient.SqlClient
      const { table, columns } = SettingSchema
      const findValue = SqlSchema.findOneOption({
        Request: Schema.String,
        Result: Schema.Struct({ value: Schema.String }),
        execute: (key) =>
          sql`SELECT ${sql(columns.value)} AS value FROM ${sql(table)} WHERE ${sql(columns.key)} = ${key}`,
      })
      /** The text stored under `key`, if any. */
      const read = (key: string) => Effect.map(findValue(key), Opt.map(({ value }) => value))
      /** Stores `value` under `key`, in place of what was there. */
      const write = (key: string, value: string) =>
        Effect.asVoid(sql`
          INSERT INTO ${sql(table)} (${sql(columns.key)}, ${sql(columns.value)}) VALUES (${key}, ${value})
          ON CONFLICT (${sql(columns.key)}) DO UPDATE SET ${sql(columns.value)} = excluded.${sql(columns.value)}
        `)
      /** The table every setting is in, for a query that reacts to its changes. */
      const tables = [table]
      return { read, write, tables }
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
