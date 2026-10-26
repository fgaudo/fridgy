/// <reference lib="webworker" />

import * as Browser from '@effect/platform-browser'
import * as SqliteWasm from '@effect/sql-sqlite-wasm'

Browser.BrowserRuntime.runMain(
  SqliteWasm.OpfsWorker.run({
    dbName: 'fridgy',
    port: self,
  }),
)
