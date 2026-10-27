import * as Layer from 'effect/Layer'
import * as StoredProducts from '#infrastructure/storage/products.test_support.ts'
import { ProductStore } from '#infrastructure/storage/products.ts'
import * as SqliteMemory from '#infrastructure/storage/sqlite.memory.ts'
import * as ProductListSql from './product-list.sql.ts'
import { productListContract } from './product-list.test_contract.ts'

productListContract(
  'sqlite',
  () => ProductListSql.layer.pipe(Layer.provideMerge(ProductStore.layer), Layer.provideMerge(SqliteMemory.layer)),
  { insert: StoredProducts.insert, remove: StoredProducts.remove },
)
