import * as ConfigProvider from 'effect/ConfigProvider'
import * as DateTime from 'effect/DateTime'
import * as FetchHttpClient from 'effect/http/FetchHttpClient'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as App from '#app/layer.ts'
import * as RootView from '#app/view.tsx'
import * as BackButtonCapacitor from '#infrastructure/back-button/back-button.capacitor.ts'
import * as CrashScreen from '#infrastructure/crash-screen.ts'
import * as SqliteOpfs from '#infrastructure/storage/sqlite.opfs.ts'
import { SnabbdomRenderer } from '#libs/tea-snabbdom/renderer.ts'
import { RootViews, run } from './run.ts'

const layer = App.layer.pipe(
  Layer.provide([SqliteOpfs.layer, FetchHttpClient.layer]),
  Layer.provide(
    ConfigProvider.layer(
      ConfigProvider.fromUnknown({
        sqlite: { workerPath: './sqlite.opfs.worker.js' },
      }),
    ),
  ),
)

run(
  Layer.mergeAll(
    layer,
    BackButtonCapacitor.layer,
    DateTime.layerCurrentZoneLocal,
    Layer.succeed(RootViews, Stream.make(RootView.view)),
    SnabbdomRenderer.layer('#root'),
    Layer.succeed(References.MinimumLogLevel, 'Info'),
  ).pipe(Layer.orDie),
  CrashScreen.show,
)
