// The production database engine: wa-sqlite in a worker (`sqlite.worker.ts`), on the origin private file system,
// with the migrations run.
import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { migrations } from './migrations.ts'

const makeWorker = Effect.acquireRelease(
  Effect.gen(function*() {
    const workerPath = yield* Config.String('workerPath').pipe(
      Config.nested('sqlite'),
    )
    return yield* Effect.sync(
      () =>
        new Worker(workerPath, {
          type: 'module',
        }),
    )
  }).pipe(Effect.catchTag('ConfigError', Effect.die)),
  (worker) =>
    Effect.sync(() => {
      worker.terminate()
    }),
)

export const layer = SqliteWasm.SqliteMigrator.layer({
  loader: SqliteWasm.SqliteMigrator.fromRecord(migrations),
}).pipe(
  Layer.provideMerge(
    SqliteWasm.SqliteClient.layer({
      installReactivityHooks: true,
      worker: makeWorker,
    }),
  ),
  Layer.tap(() => Effect.logInfo('Storage ready: sqlite, migrated', Object.keys(migrations))),
  Layer.orDie,
)
