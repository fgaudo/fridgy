import * as Layer from 'effect/Layer'
import * as ProductCommandsInMemory from '#app/adapters/product-commands/in-memory.ts'
import { productListContract } from '../../ports/product-list.test_contract.ts'
import * as ProductListInMemory from './in-memory.ts'
import { InMemoryStore } from '#infrastructure/in-memory/store.ts'

productListContract(
  'in memory',
  () =>
    Layer.mergeAll(ProductCommandsInMemory.layer, ProductListInMemory.layer).pipe(Layer.provide(InMemoryStore.layer)),
)
