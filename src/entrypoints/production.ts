import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as RootView from '#app/view.tsx'
import { SnabbdomRenderer } from '#infrastructure/snabbdom-renderer.ts'
import { RootViews, run } from './run.ts'

import * as ConfigProvider from 'effect/ConfigProvider'
import * as AppSqlite from '#app/sqlite.layer.ts'
import * as SqlHelper from '#infrastructure/sql/sql-helper.ts'
import * as Sqlite from '#infrastructure/sqlite/layer.ts'

const layer = AppSqlite.layer.pipe(
  Layer.provide(SqlHelper.SqlHelper.layer),
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
    Layer.succeed(RootViews, Stream.make(RootView.view)),
    SnabbdomRenderer.layer('#root'),
    Layer.succeed(References.MinimumLogLevel, 'Info'),
  ).pipe(Layer.orDie),
)
