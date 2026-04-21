import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { migrations } from '@/infra/shared/sql/migrations.ts'

export const layer = Layer.unwrap(
	Effect.gen(function* () {
		const makeWorker = Effect.acquireRelease(
			Effect.gen(function* () {
				const workerPath = yield* Config.string('workerPath').pipe(
					Config.nested('sqlite'),
				)
				return yield* Effect.sync(
					() =>
						new Worker(workerPath, {
							type: 'module',
						}),
				)
			}).pipe(Effect.catchTag('ConfigError', Effect.die)),
			worker =>
				Effect.sync(() => {
					worker.terminate()
				}),
		)
		const clientLayer = SqliteWasm.SqliteClient.layer({
			worker: makeWorker,
		})
		return SqliteWasm.SqliteMigrator.layer({
			loader: SqliteWasm.SqliteMigrator.fromRecord(migrations),
		}).pipe(Layer.provideMerge(clientLayer), Layer.orDie)
	}),
)
