/// <reference lib="webworker" />

import * as Browser from '@effect/platform-browser'
import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'

// A page that is gone releases the lock within milliseconds. One that stays is a bug, which this turns into a crash.
const LOCK_TIMEOUT_MS = 10_000

/**
 * Held while the database is open. A recreated activity (a change of the font size, `docs/font-size.md`) loads a
 * new page before the old one's worker is terminated, and that worker still holds the database's access handles.
 * The browser releases the lock with the worker that holds it.
 */
const exclusive = (name: string) =>
  Effect.acquireRelease(
    Effect.callback<() => void>((resume) => {
      void navigator.locks.request(
        name,
        { signal: AbortSignal.timeout(LOCK_TIMEOUT_MS) },
        () => new Promise<void>((release) => resume(Effect.succeed(release))),
      ).catch((cause: unknown) =>
        resume(Effect.die(new Error('Another page held the database for too long', { cause })))
      )
    }),
    (release) => Effect.sync(release),
  )

// A failure is reported as the worker's uncaught error, which the page's `Worker` receives as an `error` event:
// the client would otherwise wait for its "ready" message forever.
Browser.BrowserRuntime.runMain(
  exclusive('fridgy').pipe(
    Effect.andThen(SqliteWasm.OpfsWorker.run({ dbName: 'fridgy', port: self })),
    Effect.scoped,
    Effect.tapCause((cause) =>
      Cause.hasInterruptsOnly(cause) ? Effect.void : Effect.sync(() => reportError(Cause.squash(cause)))
    ),
  ),
)
