import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import { productCommandsContract } from '#app/ports/product-commands.test_contract.ts'
import * as ProductCommandsInMemory from './in-memory.ts'
import { InMemoryStore } from '#infrastructure/in-memory/store.ts'

productCommandsContract(
  'in memory',
  () => ProductCommandsInMemory.layer.pipe(Layer.provideMerge(InMemoryStore.layer)),
  (id) =>
    InMemoryStore.use(({ tables }) => SubscriptionRef.get(tables)).pipe(
      Effect.map(({ products }) =>
        Opt.map(Arr.findFirst(products, (row) => row.id.toString(10) === id), (row) => ({
          maybeName: Opt.some(row.name),
          maybeCreationDate: Opt.some(row.creationDate),
          maybeExpirationDate: row.maybeExpirationDate,
        }))
      ),
    ),
)
