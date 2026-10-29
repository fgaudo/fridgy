// The production database engine: wa-sqlite in a worker (`sqlite.opfs.worker.ts`), on the origin private file system,
// with the migrations run.
import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Config from 'effect/Config'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Fiber from 'effect/Fiber'
import * as Layer from 'effect/Layer'
import { migrations } from './migrations.ts'

/** The worker, whose first error (its script failing to load, the database failing to open) completes `failed`. */
const makeWorker = (failed: Deferred.Deferred<never>) =>
  Effect.acquireRelease(
    Effect.gen(function*() {
      const workerPath = yield* Config.String('workerPath').pipe(
        Config.nested('sqlite'),
      )
      return yield* Effect.sync(() => {
        const worker = new Worker(workerPath, {
          type: 'module',
        })
        worker.addEventListener('error', (event) => {
          Deferred.doneUnsafe(failed, Effect.die(event.message || 'The SQLite worker failed to load'))
        })
        return worker
      })
    }).pipe(Effect.catchTag('ConfigError', Effect.die)),
    (worker) =>
      Effect.sync(() => {
        worker.terminate()
      }),
  )

// The client waits for the worker's "ready" message, which a failed worker never sends, and its own handler of the
// worker's errors needs the client to exist already. So the wait is raced with the worker's error. The wait cannot
// be interrupted, so it runs detached and is left behind; closing the scope still terminates the worker.
const client = Layer.effectContext(Effect.gen(function*() {
  const failed = yield* Deferred.make<never>()
  const building = yield* Layer.build(
    SqliteWasm.SqliteClient.layer({
      installReactivityHooks: true,
      worker: makeWorker(failed),
    }),
  ).pipe(Effect.forkDetach)
  return yield* Fiber.join(building).pipe(Effect.raceFirst(Deferred.await(failed)))
}))

export const layer = SqliteWasm.SqliteMigrator.layer({
  loader: SqliteWasm.SqliteMigrator.fromRecord(migrations),
}).pipe(
  Layer.provideMerge(client),
  Layer.tap(() => Effect.logInfo('Storage ready: sqlite, migrated', Object.keys(migrations))),
  Layer.orDie,
)
