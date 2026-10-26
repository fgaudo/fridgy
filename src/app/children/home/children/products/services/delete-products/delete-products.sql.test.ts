import * as Layer from 'effect/Layer'
import * as StoredProducts from '#infrastructure/storage/products.test_support.ts'
import { ProductStore } from '#infrastructure/storage/products.ts'
import * as SqliteMemory from '#infrastructure/storage/sqlite.memory.ts'
import * as DeleteProductsSql from './delete-products.sql.ts'
import { deleteProductsContract } from './delete-products.test_contract.ts'

deleteProductsContract(
  'sqlite',
  () => DeleteProductsSql.layer.pipe(Layer.provideMerge(ProductStore.layer), Layer.provide(SqliteMemory.layer)),
  { insert: StoredProducts.insert, readBack: StoredProducts.readBack },
)
