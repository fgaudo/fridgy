import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Layer from 'effect/Layer'
import { migrations } from './migrations.ts'

/** The production database engine (wa-sqlite) and migrations, in memory and without a worker: empty on every start. */
export const layer = SqliteWasm.SqliteMigrator.layer({
  loader: SqliteWasm.SqliteMigrator.fromRecord(migrations),
}).pipe(
  Layer.provideMerge(SqliteWasm.SqliteClient.layerMemory({ installReactivityHooks: true })),
  Layer.orDie,
)
