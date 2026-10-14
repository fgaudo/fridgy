import * as Browser from '@effect/platform-browser'
import * as ConfigProvider from 'effect/ConfigProvider'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as CoreApp from '@/core/app.ts'
import * as CoreLive from '@/core/live.ts'
import * as HomeLive from '@/feature/home/live.ts'

import * as SqlHelper from '@/infra/sql/sql-helper.ts'
import * as Sqlite from '@/infra/sqlite/layer.ts'
import { Hot, Renderer, Static } from './core'
import { prepare } from '@/libs/fsm.ts'

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
  ? Static
  : (() => {
    // @ts-expect-error
    const host = process.env.UI_EMITTER_WEBSOCKET_HOST
    // @ts-expect-error
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const port = (process.env.UI_EMITTER_WEBSOCKET_PORT as number).toString(
      10,
    )
    return Layer.provide(
      Hot,
      Browser.BrowserSocket.layerWebSocket(`ws://${host}:${port}`),
    )
  })()

const Base = Layer.provideMerge(
  Layer.provide(
    Layer.mergeAll(
      Infra,
      UiLayer,
    ),
    ConfigLayer,
  ),
  Layer.succeed(References.MinimumLogLevel, 'Debug'),
)

Browser.BrowserRuntime.runMain(
  Effect.gen(function*() {
    const engine = yield* prepare({
      update: CoreApp.update,
      emitter: CoreApp.subscriptions,
      makeDefectMessage: CoreApp.makeDefectMessage,
    })(CoreApp.init)
    const { render } = yield* Renderer
    yield* render(
      engine,
      CoreApp.makeModel,
    )
  }).pipe(
    Effect.scoped,
    Effect.provide(Base),
  ),
)
