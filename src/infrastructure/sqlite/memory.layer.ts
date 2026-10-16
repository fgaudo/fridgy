import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Layer from 'effect/Layer'
import { migrations } from '#infrastructure/sql/migrations.ts'

/** The production database engine (wa-sqlite) and migrations, in memory and without a worker: for tests. */
export const layer = SqliteWasm.SqliteMigrator.layer({
  loader: SqliteWasm.SqliteMigrator.fromRecord(migrations),
}).pipe(
  Layer.provideMerge(SqliteWasm.SqliteClient.layerMemory({ installReactivityHooks: true })),
  Layer.orDie,
)
