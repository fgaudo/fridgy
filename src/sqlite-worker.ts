/// <reference lib="webworker" />

import * as Browser from '@effect/platform-browser'
import * as SqliteWasm from '@effect/sql-sqlite-wasm'

import { name } from '../package.json' with { type: 'json' }

Browser.BrowserRuntime.runMain(
	SqliteWasm.OpfsWorker.run({
		dbName: name,
		port: self,
	}),
)
