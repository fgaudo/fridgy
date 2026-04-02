/// <reference lib="webworker" />

import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Effect from 'effect/Effect'

Effect.runFork(
	SqliteWasm.OpfsWorker.run({
		dbName: 'fridgy',
		port: self,
	}),
)
