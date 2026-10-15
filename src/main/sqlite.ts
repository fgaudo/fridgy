import * as ConfigProvider from 'effect/ConfigProvider'
import * as Layer from 'effect/Layer'
import * as AppSqlite from '@/app/sqlite.ts'
import * as SqlHelper from '@/infra/sql/sql-helper.ts'
import * as Sqlite from '@/infra/sqlite/layer.ts'

/** The app's sqlite setup, with the infrastructure it needs. */
export const layer = AppSqlite.layer.pipe(
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
