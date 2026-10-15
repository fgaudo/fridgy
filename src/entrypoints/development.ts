// `view.js` and the hot reload socket are served by `scripts/cli.ts watch`.
import * as Browser from '@effect/platform-browser'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as AppInMemory from '@/app/in-memory.layer.ts'
import type * as RootView from '@/app/view.tsx'
import { CssRefresher } from '@/infra/css-refresher.ts'
import { InMemoryStore } from '@/infra/in-memory/store.ts'
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
    Browser.BrowserSocket.layerWebSocket(`ws://${location.host}/hot-reload`),
    CssRefresher.layer('#css'),
  ]),
)

run(
  Layer.mergeAll(
    AppInMemory.layer.pipe(Layer.provide(InMemoryStore.layer)),
    HotRootViews,
    SnabbdomRenderer.layer('#root'),
    Layer.succeed(References.MinimumLogLevel, 'Debug'),
  ).pipe(Layer.orDie),
)
