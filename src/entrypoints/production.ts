import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as RootView from '#app/view.tsx'
import { SnabbdomRenderer } from '#libs/tea-snabbdom/renderer.ts'
import { RootViews, run } from './run.ts'

import * as ConfigProvider from 'effect/ConfigProvider'
import * as App from '#app/layer.ts'
import * as BackButtonCapacitor from '#infrastructure/back-button/capacitor.layer.ts'
import * as Sqlite from '#infrastructure/sqlite/layer.ts'

const layer = App.layer.pipe(
  Layer.provide(Sqlite.layer),
  Layer.provide(
    ConfigProvider.layer(
      ConfigProvider.fromUnknown({
        sqlite: { workerPath: './sqlite.worker.js' },
      }),
    ),
  ),
)

run(
  Layer.mergeAll(
    layer,
    BackButtonCapacitor.layer,
    Layer.succeed(RootViews, Stream.make(RootView.view)),
    SnabbdomRenderer.layer('#root'),
    Layer.succeed(References.MinimumLogLevel, 'Info'),
  ).pipe(Layer.orDie),
)
