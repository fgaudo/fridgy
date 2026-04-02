import * as Browser from '@effect/platform-browser'
import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { sql } from './business/sql.ts'

const worker = Effect.acquireRelease(
	Effect.sync(
		() =>
			new Worker('http://localhost:3000/sqlite-worker.js', {
				type: 'module',
			}),
	),
	worker =>
		Effect.sync(() => {
			worker.terminate()
		}),
)

export const layer = sql.pipe(
	Layer.provide(
		SqliteWasm.SqliteClient.layer({
			worker: worker,
		}),
	),
	Layer.orDie,
)
