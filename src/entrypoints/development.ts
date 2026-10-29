// `view.js` and the hot reload socket are served by `scripts/cli.ts watch`.
import * as Browser from '@effect/platform-browser'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as FetchHttpClient from 'effect/http/FetchHttpClient'
import * as Layer from 'effect/Layer'
import * as Match from 'effect/Match'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as Sql from 'effect/sql'
import * as App from '#app/layer.ts'
import type * as RootView from '#app/view.tsx'
import * as BackButtonBrowser from '#infrastructure/back-button/back-button.browser.ts'
import { CssRefresher } from '#infrastructure/css-refresher.ts'
import * as HotModule from '#infrastructure/hot-module.ts'
import * as SqliteSamples from '#infrastructure/storage/samples.ts'
import { ProductExpirationSchema, ProductSchema, SettingSchema } from '#infrastructure/storage/schema.ts'
import * as SqliteMemory from '#infrastructure/storage/sqlite.memory.ts'
import { SnabbdomRenderer } from '#libs/tea-snabbdom/renderer.ts'
import { RootViews, run } from './run.ts'

const HotRootViews = Layer.effect(
  RootViews,
  HotModule.watch('./view.js').pipe(
    Effect.map(Stream.map((module) => (module as typeof RootView).view)),
  ),
).pipe(
  Layer.provide([
    Browser.BrowserSocket.layerWebSocket(`ws://${location.host}/hot-reload`),
    CssRefresher.layer('#css'),
  ]),
)

// A database in memory, with sample products: every reload starts from the same data.
const samples = Layer.provideMerge(SqliteSamples.layer, SqliteMemory.layer)

/**
 * Writes of products and settings that fail, once the samples are in, while reads still work: each failure's
 * snackbar can then be looked at (`docs/testing.md`). `?storage=failing` fails every write;
 * `?storage=failing-but-deletes` lets deletions through, so that an undo can fail.
 */
const failing = (operations: ReadonlyArray<'INSERT' | 'UPDATE' | 'DELETE'>) =>
  Layer.effectDiscard(Effect.gen(function*() {
    const sql = yield* Sql.SqlClient.SqlClient
    const tables = [ProductSchema.table, ProductExpirationSchema.table, SettingSchema.table]
    yield* Effect.forEach(
      tables.flatMap((table) => operations.map((operation) => ({ table, operation }))),
      ({ table, operation }) =>
        sql.unsafe(`
          CREATE TRIGGER failing_${operation.toLowerCase()}_${table} BEFORE ${operation} ON ${table}
          BEGIN SELECT RAISE(ABORT, 'Failing on purpose: ?storage=failing'); END
        `),
    )
    yield* Effect.logInfo('Storage ready: writes fail', { operations })
  })).pipe(Layer.orDie)

const storage = Match.value(new URLSearchParams(location.search).get('storage')).pipe(
  Match.when('failing', () => Layer.provideMerge(failing(['INSERT', 'UPDATE', 'DELETE']), samples)),
  Match.when('failing-but-deletes', () => Layer.provideMerge(failing(['INSERT', 'UPDATE']), samples)),
  Match.orElse(() => samples),
)

run(
  Layer.mergeAll(
    // Products are looked up on Open Food Facts itself: its staging server asks for a password.
    // One zone serves the samples, which expire from today, and the programs.
    App.layer.pipe(Layer.provide([storage, FetchHttpClient.layer]), Layer.provideMerge(DateTime.layerCurrentZoneLocal)),
    BackButtonBrowser.layer,
    HotRootViews,
    SnabbdomRenderer.layer('#root'),
    Layer.succeed(References.MinimumLogLevel, 'Debug'),
  ).pipe(Layer.orDie),
  // A crash leaves the last frame and the console as they are: what a developer reads.
  Effect.void,
)
