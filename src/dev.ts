import * as Browser from '@effect/platform-browser'
import * as ConfigProvider from 'effect/ConfigProvider'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as CoreApp from '@/core/app.ts'
import * as CoreLive from '@/core/live.ts'
import * as HomeLive from '@/feature/home/live.ts'
import * as SqlHelper from '@/infra/sql/sql-helper.ts'
import * as Sqlite from '@/infra/sqlite/layer.ts'
import { prepare, states } from '@/libs/fsm.ts'
import { Hot, ModuleLoader, SnabbdomPatcher, Static } from './runtime/index.ts'

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
  HomeLive.live,
  CoreLive.live,
).pipe(
  Layer.provide(SqlHelper.SqlHelper.layer),
  Layer.provide(Sqlite.layer),
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
  Effect.scoped(
    Effect.gen(function*() {
      const fsm = yield* prepare({
        update: CoreApp.update,
        emitter: CoreApp.subscriptions,
        makeDefectMessage: CoreApp.makeDefectMessage,
      })(CoreApp.init)
      const view$ = yield* ModuleLoader
      const patcher = yield* SnabbdomPatcher
      yield* Stream.zipLatestAll(
        states(fsm).pipe(Stream.map(CoreApp.makeModel)),
        view$.pipe(Stream.mapEffect((view) => view)),
      ).pipe(
        Stream.map(([model, view]) => view(model)),
        Stream.mapEffect(patcher),
        Stream.runDrain,
      )
    }),
  ).pipe(
    Effect.provide(Base),
  ),
)
