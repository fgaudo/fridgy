import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import { productCommandsContract } from '../../ports/product-commands.test-contract.ts'
import * as ProductCommandsSql from './sql.ts'
import * as SqlHelper from '@/infra/sql/sql-helper.ts'
import * as SqliteMemory from '@/infra/sqlite/memory.layer.ts'

productCommandsContract(
  'sqlite',
  () => ProductCommandsSql.layer.pipe(Layer.provideMerge(SqlHelper.SqlHelper.layer), Layer.provide(SqliteMemory.layer)),
  (id) =>
    SqlHelper.SqlHelper.use(({ getProducts }) => getProducts).pipe(
      Effect.map((rows) =>
        Opt.map(Arr.findFirst(rows, (row) => Opt.contains(Opt.map(row.maybeId, String), id)), (row) => ({
          maybeName: row.maybeName,
          maybeCreationDate: row.maybeCreationDate,
          maybeExpirationDate: row.maybeExpirationDate,
        }))
      ),
    ),
)
