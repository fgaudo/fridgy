import * as Layer from 'effect/Layer'
import * as ProductCommandsSql from '../../../../adapters/product-commands/sql.ts'
import { productListContract } from '../../ports/product-list.contract.ts'
import * as ProductListSql from './sql.ts'
import * as SqlHelper from '@/infra/sql/sql-helper.ts'
import * as SqliteMemory from '@/infra/sqlite/memory.layer.ts'

productListContract(
  'sqlite',
  () =>
    Layer.mergeAll(ProductCommandsSql.layer, ProductListSql.layer).pipe(
      Layer.provide(SqlHelper.SqlHelper.layer),
      Layer.provideMerge(SqliteMemory.layer),
    ),
)
