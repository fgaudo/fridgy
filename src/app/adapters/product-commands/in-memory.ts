import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as ProductCommands from '../../ports/product-commands.ts'
import { InMemoryStore } from '@/infra/in-memory/store.ts'

export const layer = Layer.effect(
  ProductCommands.ProductCommands,
  InMemoryStore.useSync(({ tables }) => ({
    add: RequestResolver.make<ProductCommands.AddProduct>((entries) =>
      Effect.forEach(entries, (entry) =>
        SubscriptionRef.modify(tables, ({ nextProductId, products }) => {
          const { snapshot } = entry.request
          return [nextProductId.toString(10), {
            nextProductId: nextProductId + 1,
            products: Arr.append(products, {
              id: nextProductId,
              name: snapshot.name,
              creationDate: snapshot.creationDate,
              maybeExpirationDate: snapshot.maybeExpirationDate,
            }),
          }]
        }).pipe(Effect.flatMap((id) => Request.succeed(entry, id))), { discard: true })
    ),

    deleteById: RequestResolver.make<ProductCommands.DeleteProductById>((entries) =>
      Effect.forEach(entries, (entry) =>
        SubscriptionRef.update(tables, (state) => ({
          ...state,
          products: Arr.filter(state.products, (row) => row.id.toString(10) !== entry.request.id),
        })).pipe(Effect.flatMap(() => Request.succeed(entry, undefined))), { discard: true })
    ),
  })),
)
