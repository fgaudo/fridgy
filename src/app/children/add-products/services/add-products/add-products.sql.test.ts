import * as Layer from 'effect/Layer'
import * as StoredProducts from '#infrastructure/sql/products.test_support.ts'
import * as SqlHelper from '#infrastructure/sql/sql-helper.ts'
import * as SqliteMemory from '#infrastructure/sqlite/memory.layer.ts'
import { addProductsContract } from './add-products.test_contract.ts'
import * as AddProductsSql from './add-products.sql.ts'

addProductsContract(
  'sqlite',
  () => AddProductsSql.layer.pipe(Layer.provideMerge(SqlHelper.SqlHelper.layer), Layer.provide(SqliteMemory.layer)),
  StoredProducts.readBack,
)
