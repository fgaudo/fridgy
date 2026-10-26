// `view.js` and the hot reload socket are served by `scripts/cli.ts watch`.
import * as Browser from '@effect/platform-browser'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as App from '#app/layer.ts'
import type * as RootView from '#app/view.tsx'
import * as BackButtonBrowser from '#infrastructure/back-button/browser.layer.ts'
import { CssRefresher } from '#infrastructure/css-refresher.ts'
import * as HotModule from '#infrastructure/hot-module.ts'
import * as SqliteMemory from '#infrastructure/sqlite/memory.layer.ts'
import * as SqliteSamples from '#infrastructure/sqlite/samples.ts'
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

run(
  Layer.mergeAll(
    // A database in memory, with sample products: every reload starts from the same data.
    App.layer.pipe(Layer.provide(Layer.provideMerge(SqliteSamples.layer, SqliteMemory.layer))),
    BackButtonBrowser.layer,
    HotRootViews,
    SnabbdomRenderer.layer('#root'),
    Layer.succeed(References.MinimumLogLevel, 'Debug'),
  ).pipe(Layer.orDie),
)
