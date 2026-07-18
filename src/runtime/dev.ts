import * as Browser from '@effect/platform-browser'
import * as ConfigProvider from 'effect/ConfigProvider'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as CoreApp from '@/core/app.ts'
import * as CoreLive from '@/core/live.ts'
import * as HomeLive from '@/feature/home/live.ts'
import { CssRefresher } from '@/infra/css-refresher.ts'
import * as SqlHelper from '@/infra/sql/sql-helper.ts'
import * as Sqlite from '@/infra/sqlite/layer.ts'
import { prepare, states } from '@/libs/fsm.ts'
import { ViewModuleLoader } from './module-loader/index.ts'
import { SnabbdomRenderer } from './renderer/index.ts'

const ConfigLayer = ConfigProvider.layer(
  ConfigProvider.fromUnknown({
    sqlite: {
      workerPath: './sqlite.worker.js',
    },
    ui: {
      hotModule: {
        viewPath: './view.js',
      },
    },
  }),
)

const Infra = Layer.mergeAll(
  HomeLive.home.pipe(
    Layer.provide(SqlHelper.SqlHelper.layer),
    Layer.provide(Sqlite.layer),
  ),
  CoreLive.live,
)

const UiLayer = process.env.NODE_ENV === 'production'
  ? ViewModuleLoader.Static
  : (() => {
    // @ts-expect-error
    const host = process.env.UI_EMITTER_WEBSOCKET_HOST
    // @ts-expect-error
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const port = (process.env.UI_EMITTER_WEBSOCKET_PORT as number).toString(
      10,
    )
    return Layer.provide(
      ViewModuleLoader.Hot,
      [
        Browser.BrowserSocket.layerWebSocket(`ws://${host}:${port}`),
        CssRefresher.layer('#css'),
      ],
    )
  })()

const Base = Layer.mergeAll(
  Layer.provideMerge(
    Layer.provide(
      Layer.mergeAll(
        Infra,
        UiLayer,
      ),
      ConfigLayer,
    ),
    Layer.succeed(References.MinimumLogLevel, 'Debug'),
  ).pipe(Layer.orDie),
  SnabbdomRenderer.layer('#root'),
)

Browser.BrowserRuntime.runMain(
  Effect.gen(function*() {
    const engine = yield* prepare({
      update: CoreApp.update,
      emitter: CoreApp.subscriptions,
      makeDefectMessage: CoreApp.makeDefectMessage,
    })(CoreApp.init)
    const { render } = yield* SnabbdomRenderer
    const viewLoader = yield* ViewModuleLoader
    yield* render(
      Stream.zipLatestAll(
        states(engine).pipe(
          Stream.map(CoreApp.makeModel),
        ),
        viewLoader.pipe(
          Stream.mapEffect((view) => view.makeView),
          Stream.map(([view]) => view),
        ),
      ).pipe(
        Stream.map(([model, view]) => view(model)),
      ),
    )
  }).pipe(
    Effect.scoped,
    Effect.provide(Base),
  ),
)
