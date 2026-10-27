import * as Layer from 'effect/Layer'
import * as StoredProducts from '#infrastructure/storage/products.test_support.ts'
import { ProductStore } from '#infrastructure/storage/products.ts'
import * as SqliteMemory from '#infrastructure/storage/sqlite.memory.ts'
import * as AddProductsSql from './add-products.sql.ts'
import { addProductsContract } from './add-products.test_contract.ts'

addProductsContract(
  'sqlite',
  () => AddProductsSql.layer.pipe(Layer.provideMerge(ProductStore.layer), Layer.provideMerge(SqliteMemory.layer)),
  StoredProducts.readBack,
)
