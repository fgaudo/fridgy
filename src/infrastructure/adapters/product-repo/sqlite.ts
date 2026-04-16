import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import * as Sql from './sql.ts'

export const layer = Effect.fn(function* (workerPath: string) {
	const makeWorker = Effect.acquireRelease(
		Effect.sync(
			() =>
				new Worker(workerPath, {
					type: 'module',
				}),
		),
		worker =>
			Effect.sync(() => {
				worker.terminate()
			}),
	)
	const clientLayer = SqliteWasm.SqliteClient.layer({
		worker: makeWorker,
	})
	const migratorWithClientLayer = SqliteWasm.SqliteMigrator.layer({
		loader: SqliteWasm.SqliteMigrator.fromRecord(Sql.migrations),
	}).pipe(Layer.provideMerge(clientLayer))
	return Sql.layer.pipe(Layer.provide(migratorWithClientLayer), Layer.orDie)
}, Layer.unwrap)
