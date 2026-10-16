import * as Layer from 'effect/Layer'
import * as ProductCommandsSql from '#app/adapters/product-commands/sql.ts'
import { productListContract } from '../../ports/product-list.test_contract.ts'
import * as ProductListSql from './sql.ts'
import * as SqlHelper from '#infrastructure/sql/sql-helper.ts'
import * as SqliteMemory from '#infrastructure/sqlite/memory.layer.ts'

productListContract(
  'sqlite',
  () =>
    Layer.mergeAll(ProductCommandsSql.layer, ProductListSql.layer).pipe(
      Layer.provide(SqlHelper.SqlHelper.layer),
      Layer.provideMerge(SqliteMemory.layer),
    ),
)
