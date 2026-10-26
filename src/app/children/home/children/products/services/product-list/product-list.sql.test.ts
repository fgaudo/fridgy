import * as Layer from 'effect/Layer'
import * as StoredProducts from '#infrastructure/sql/products.test_support.ts'
import * as SqlHelper from '#infrastructure/sql/sql-helper.ts'
import * as SqliteMemory from '#infrastructure/sqlite/memory.layer.ts'
import { productListContract } from './product-list.test_contract.ts'
import * as ProductListSql from './product-list.sql.ts'

productListContract(
  'sqlite',
  () => ProductListSql.layer.pipe(Layer.provideMerge(SqlHelper.SqlHelper.layer), Layer.provide(SqliteMemory.layer)),
  { insert: StoredProducts.insert, remove: StoredProducts.remove },
)
