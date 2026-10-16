import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import type * as NonEmptyHashSet from '@/libs/collections/non-empty-hash-set.ts'
import * as Product from '../../../domain/product.ts'
import { Notifications } from '../ports/notifications.ts'
import * as ProductCommands from '../../../ports/product-commands.ts'
import { Viewport } from '../ports/viewport.ts'
import { Message } from './messages.ts'
import type { OperationId } from './state.ts'

export const deleteProducts = Effect.fn(function*({
  operation,
  ids,
}: {
  operation: OperationId
  ids: NonEmptyHashSet.NonEmptyHashSet<string>
}) {
  const { deleteById } = yield* ProductCommands.ProductCommands
  yield* Effect.logDebug('Deleting products', { count: HashSet.size(ids) })
  const maybeDeleted = yield* pipe(
    ids,
    HashSet.map((id) => ProductCommands.DeleteProductById({ id })),
    Effect.forEach(Effect.request(deleteById), { concurrency: 'unbounded' }),
    Effect.option,
  )
  // The storage logs the cause.
  yield* Opt.isSome(maybeDeleted)
    ? Effect.logInfo('Deleted products', { count: HashSet.size(ids) })
    : Effect.logWarning('Could not delete the products')
  return Opt.some(Message.DeleteProductsCompleted({ operation, succeeded: Opt.isSome(maybeDeleted) }))
}, (effect, { operation }) => effect.pipe(Effect.withLogSpan('DeleteProducts'), Effect.annotateLogs({ operation })))

export const addProduct = Effect.fn(function*(
  operation: OperationId,
  productData: {
    maybeExpirationDate: Opt.Option<DateTime.Utc>
    maybeName: Opt.Option<string>
  },
) {
  const { add } = yield* ProductCommands.ProductCommands
  const current = yield* DateTime.now
  const maybeProduct = Product.fromSnapshot({
    maybeCreationDate: Opt.some(current),
    maybeExpirationDate: productData.maybeExpirationDate,
    maybeName: productData.maybeName,
  })
  if (Opt.isNone(maybeProduct)) {
    yield* Effect.logWarning('The product is not valid: it was not added', productData)
    return Opt.some(Message.AddProductCompleted({ operation, succeeded: false }))
  }
  const product = maybeProduct.value
  yield* Effect.logDebug('Adding a product', Product.name(product))
  const maybeId = yield* pipe(
    ProductCommands.AddProduct({ snapshot: Product.toSnapshot(product) }),
    Effect.request(add),
    Effect.option,
  )
  if (Opt.isNone(maybeId)) {
    // The storage logs the cause.
    yield* Effect.logWarning('Could not add the product')
    return Opt.some(Message.AddProductCompleted({ operation, succeeded: false }))
  }
  yield* Effect.logInfo('Added a product', { id: maybeId.value })
  return Opt.some(Message.AddProductCompleted({ operation, succeeded: true }))
}, (effect, operation) => effect.pipe(Effect.withLogSpan('AddProduct'), Effect.annotateLogs({ operation })))

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
