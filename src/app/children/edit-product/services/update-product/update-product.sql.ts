import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import type * as Product from '#domain/product.ts'
import { ProductStore } from '#infrastructure/storage/products.ts'
import * as Integer from '#libs/numbers/integer.ts'
import { ProductNotStored, UpdateProduct, UpdateProductError } from './update-product.ts'

export const layer = Layer.effect(
  UpdateProduct,
  Effect.gen(function*() {
    const store = yield* ProductStore
    const update = Effect.fn('UpdateProduct.update')(
      function*(id: string, snapshot: Product.Snapshot) {
        const maybeStored = pipe(
          Number(id),
          Integer.make,
          // Only the form ids are written in: `parseInt` would read "1 " or "1abc" as 1.
          Opt.filter((integer) => integer.toString(10) === id),
        )
        if (Opt.isNone(maybeStored)) return yield* new ProductNotStored({ id })
        const maybeUpdated = yield* store.update(maybeStored.value, snapshot).pipe(
          Effect.tapError((error) => Effect.logWarning('Could not update the product', error)),
          Effect.mapError((cause) => new UpdateProductError({ cause })),
        )
        if (Opt.isNone(maybeUpdated)) return yield* new ProductNotStored({ id })
      },
    )
    return { update }
  }),
).pipe(Layer.provide(ProductStore.layer))
