import * as Browser from '@effect/platform-browser'
import * as ConfigProvider from 'effect/ConfigProvider'
import * as DateTime from 'effect/DateTime'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Usecase from '@/app/use-cases/index.ts'
import { layer as FsmDispatcherLayer } from '@/infra/adapters/inbound/message-dispatcher.ts'
import * as GetLicenses from '@/infra/adapters/outbound/licenses/adapter.ts'
import { layer as FsmEmitterLayer } from '@/infra/adapters/outbound/model-emitter.ts'
import { Hot, Static } from '@/infra/adapters/outbound/model-renderer/index.ts'
import { staticLayer } from '@/infra/adapters/outbound/product/mock/get-products.ts'
import * as Sql from '@/infra/adapters/outbound/product/sql/index.ts'
import * as GetSayings from '@/infra/adapters/outbound/sayings/index.ts'
import { layer as ViewportCommands } from '@/infra/adapters/outbound/viewport-commands.ts'
import { layer as ViewportEvents } from '@/infra/adapters/outbound/viewport-events.ts'
import * as Fsm from '@/infra/shared/fsm.ts'
import * as SqlHelper from '@/infra/shared/sql/sql-helper.ts'
import * as Sqlite from '@/infra/shared/sqlite/layer.ts'

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

const DbLayer = Sql.layer.pipe(
  Layer.provide(SqlHelper.SqlHelper.layer),
  Layer.provide(Sqlite.layer),
)

export const AppLayer = UiLayer.pipe(
  Layer.provide(FsmDispatcherLayer),
  Layer.merge(FsmEmitterLayer),
  Layer.provide(
    Fsm.layer.pipe(
      Layer.provide([
        DateTime.layerCurrentZoneNamed(Intl.DateTimeFormat().resolvedOptions().timeZone),
        ViewportCommands,
        ViewportEvents,
        GetSayings.layer,
        GetLicenses.layer,
        Usecase.all.pipe(
          Layer.provide(staticLayer),
          Layer.provide(DbLayer),
          Layer.provide(DateTime.layerCurrentZoneNamed(Intl.DateTimeFormat().resolvedOptions().timeZone)),
          Layer.orDie,
        ),
      ]),
    ),
  ),
  Layer.provide(ConfigLayer),
  Layer.provideMerge(Layer.succeed(References.MinimumLogLevel, 'Debug')),
  Layer.orDie,
)
