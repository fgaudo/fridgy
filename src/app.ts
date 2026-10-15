// Composition root: wires infrastructure layers, starts the engine and renders.
import * as Browser from '@effect/platform-browser'
import * as ConfigProvider from 'effect/ConfigProvider'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as App from '@/app/program.ts'
import * as AppLive from '@/app/live.ts'
import * as RootView from '@/app/view.ts'
import { CssRefresher } from '@/infra/css-refresher.ts'
import * as HotModule from '@/infra/hot-module.ts'
import { SnabbdomRenderer } from '@/infra/snabbdom-renderer.ts'
import * as SqlHelper from '@/infra/sql/sql-helper.ts'
import * as Sqlite from '@/infra/sqlite/layer.ts'
import * as Engine from '@/libs/elm/engine.ts'
import type { View } from '@/libs/elm/view.ts'

class RootViews extends Context.Service<
  RootViews,
  Stream.Stream<View<App.Model, App.InternalMessage>>
>()('40f6fd4ec8d5a19d') {
  static Static = Layer.succeed(this, Stream.make(RootView.view))

  // The dev build emits the root view as a separate `view.js` module.
  static Hot = Layer.effect(
    this,
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
}

const ConfigLayer = ConfigProvider.layer(
  ConfigProvider.fromUnknown({
    sqlite: { workerPath: './sqlite.worker.js' },
  }),
)

const AppLayer = Layer.mergeAll(
  AppLive.layer.pipe(
    Layer.provide(SqlHelper.SqlHelper.layer),
    Layer.provide(Sqlite.layer),
    Layer.provide(ConfigLayer),
  ),
  process.env.NODE_ENV === 'production' ? RootViews.Static : RootViews.Hot,
  SnabbdomRenderer.layer('#root'),
  Layer.succeed(References.MinimumLogLevel, 'Debug'),
).pipe(Layer.orDie)

Browser.BrowserRuntime.runMain(
  Effect.gen(function*() {
    const engine = yield* Engine.make(App.program)
    const renderer = yield* SnabbdomRenderer
    const views = yield* RootViews
    // Whichever ends first ends the app: a dead engine or a failed render.
    yield* Effect.raceFirst(
      engine.await,
      renderer.render({
        model$: Stream.map(engine.state$, App.program.makeModel),
        view$: views,
        dispatch: engine.dispatch,
      }),
    )
  }).pipe(
    Effect.scoped,
    Effect.provide(AppLayer),
  ),
)
