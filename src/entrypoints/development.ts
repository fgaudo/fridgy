// `view.js` is built separately by `scripts/cli.ts watch`.
import * as Browser from '@effect/platform-browser'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as AppInMemory from '@/app/in-memory.layer.ts'
import type * as RootView from '@/app/view.ts'
import { CssRefresher } from '@/infra/css-refresher.ts'
import * as HotModule from '@/infra/hot-module.ts'
import { SnabbdomRenderer } from '@/infra/snabbdom-renderer.ts'
import { RootViews, run } from './run.ts'

const HotRootViews = Layer.effect(
  RootViews,
  HotModule.watch('./view.js').pipe(
    Effect.map(Stream.map((module) => (module as typeof RootView).view)),
  ),
).pipe(
  Layer.provide([
    Browser.BrowserSocket.layerWebSocket(
      // @ts-expect-error
      `ws://${process.env.UI_EMITTER_WEBSOCKET_HOST}:${process.env.UI_EMITTER_WEBSOCKET_PORT}`,
    ),
    CssRefresher.layer('#css'),
  ]),
)

run(
  Layer.mergeAll(
    AppInMemory.layer,
    HotRootViews,
    SnabbdomRenderer.layer('#root'),
    Layer.succeed(References.MinimumLogLevel, 'Debug'),
  ).pipe(Layer.orDie),
)
