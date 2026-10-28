import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'
import type * as Product from '#domain/product.ts'

/** The storage could not be written: the product stays as it was. */
export class UpdateProductError extends Data.TaggedError('UpdateProductError')<{ readonly cause: unknown }> {}

/** Nothing is stored under the id: the product was deleted since it was opened. */
export class ProductNotStored extends Data.TaggedError('ProductNotStored')<{ readonly id: string }> {}

/** Replaces a stored product; the pages see the change through the storage's changes, not through this service. */
export class UpdateProduct extends Context.Service<
  UpdateProduct,
  {
    /**
     * Writes `snapshot` under `id`, its expiration added, changed or removed with it, in one transaction. Fails
     * with `ProductNotStored` when nothing is stored under `id`, and when `id` was never one.
     */
    readonly update: (
      id: string,
      snapshot: Product.Snapshot,
    ) => Effect.Effect<void, UpdateProductError | ProductNotStored>
  }
>()('ed5339b628ff69d7') {}
