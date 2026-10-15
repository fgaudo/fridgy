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
  yield* Effect.logInfo('Attempting to delete products...')
  const maybeDeleted = yield* pipe(
    ids,
    HashSet.map((id) => ProductCommands.DeleteProductById({ id })),
    Effect.forEach(Effect.request(deleteById), { concurrency: 'unbounded' }),
    Effect.option,
  )
  if (Opt.isNone(maybeDeleted)) {
    yield* Effect.logWarning('Could not delete products')
  }
  return Opt.some(Message.DeleteProductsCompleted({ operation, succeeded: Opt.isSome(maybeDeleted) }))
}, Effect.withLogSpan('DeleteProducts'))

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
    yield* Effect.logWarning('Product is invalid')
    return Opt.some(Message.AddProductCompleted({ operation, succeeded: false }))
  }
  const product = maybeProduct.value
  yield* Effect.logInfo(`Attempting to add product "${Product.name(product)}"...`)
  const maybeId = yield* pipe(
    ProductCommands.AddProduct({ snapshot: Product.toSnapshot(product) }),
    Effect.request(add),
    Effect.option,
  )
  if (Opt.isNone(maybeId)) {
    yield* Effect.logWarning('Could not add the product')
    return Opt.some(Message.AddProductCompleted({ operation, succeeded: false }))
  }
  yield* Effect.logInfo(`Successfully added product with id ${maybeId.value}`)
  return Opt.some(Message.AddProductCompleted({ operation, succeeded: true }))
})

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
