import * as Layer from 'effect/Layer'
import * as StoredProducts from '#infrastructure/sql/products.test_support.ts'
import * as SqlHelper from '#infrastructure/sql/sql-helper.ts'
import * as SqliteMemory from '#infrastructure/sqlite/memory.layer.ts'
import { deleteProductsContract } from './delete-products.test_contract.ts'
import * as DeleteProductsSql from './delete-products.sql.ts'

deleteProductsContract(
  'sqlite',
  () => DeleteProductsSql.layer.pipe(Layer.provideMerge(SqlHelper.SqlHelper.layer), Layer.provide(SqliteMemory.layer)),
  { insert: StoredProducts.insert, readBack: StoredProducts.readBack },
)
