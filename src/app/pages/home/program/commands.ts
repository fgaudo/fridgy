import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Tea from '@fgaudo/effect-tea'
import type * as NonEmptyHashSet from '#libs/collections/non-empty-hash-set.ts'
import * as Product from '#app/domain/product.ts'
import { Notifications } from '../ports/notifications.ts'
import * as ProductCommands from '#app/ports/product-commands.ts'
import { Viewport } from '../ports/viewport.ts'
import { Message } from './messages.ts'

export const deleteProducts = (ids: NonEmptyHashSet.NonEmptyHashSet<string>) =>
  Tea.attempt(
    Effect.gen(function*() {
      const { deleteById } = yield* ProductCommands.ProductCommands
      yield* Effect.logDebug('Deleting products', { count: HashSet.size(ids) })
      yield* pipe(
        ids,
        HashSet.map((id) => ProductCommands.DeleteProductById({ id })),
        Effect.forEach(Effect.request(deleteById), { concurrency: 'unbounded', discard: true }),
        // The storage logs the cause.
        Effect.tapError(() => Effect.logWarning('Could not delete the products')),
      )
      yield* Effect.logInfo('Deleted products', { count: HashSet.size(ids) })
    }),
    {
      onSuccess: () => Message.DeleteProductsCompleted({ succeeded: true }),
      onFailure: () => Message.DeleteProductsCompleted({ succeeded: false }),
    },
  ).pipe(Effect.withLogSpan('DeleteProducts'))

export const addProduct = (
  productData: {
    maybeExpirationDate: Opt.Option<DateTime.Utc>
    maybeName: Opt.Option<string>
  },
) =>
  Tea.attempt(
    Effect.gen(function*() {
      const { add } = yield* ProductCommands.ProductCommands
      const current = yield* DateTime.now
      const product = yield* Product.fromSnapshot({
        maybeCreationDate: Opt.some(current),
        maybeExpirationDate: productData.maybeExpirationDate,
        maybeName: productData.maybeName,
      }).pipe(
        Effect.fromOption,
        Effect.tapError(() => Effect.logWarning('The product is not valid: it was not added', productData)),
      )
      yield* Effect.logDebug('Adding a product', Product.name(product))
      const id = yield* pipe(
        ProductCommands.AddProduct({ snapshot: Product.toSnapshot(product) }),
        Effect.request(add),
        // The storage logs the cause.
        Effect.tapError(() => Effect.logWarning('Could not add the product')),
      )
      yield* Effect.logInfo('Added a product', { id })
    }),
    {
      onSuccess: () => Message.AddProductCompleted({ succeeded: true }),
      onFailure: () => Message.AddProductCompleted({ succeeded: false }),
    },
  ).pipe(Effect.withLogSpan('AddProduct'))

export const scrollToTop = Effect.gen(function*() {
  const { scrollToTop } = yield* Viewport
  yield* scrollToTop
  return Opt.none()
})

export const showToast = Effect.fn(function*(text: string) {
  const { showToast } = yield* Notifications
  yield* showToast(text).pipe(
    Effect.catchTag('NotificationError', (error) => Effect.logWarning('Could not show toast', error.cause)),
  )
  return Opt.none()
})
