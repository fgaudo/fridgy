import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import type * as Result from 'effect/Result'
import { v4 as uuidv4 } from 'uuid'
import type * as NonEmptyHashSet from '@/shared/non-empty-hash-set.ts'
import * as Product from '../domain/product.ts'
import type * as AddProductIn from './inbound/add-product.ts'
import { Message } from './messages.ts'
import * as AddProductOut from './outbound/add-product.ts'
import * as DeleteProductByIdOut from './outbound/delete-product-by-id.ts'

export const deleteProducts = Effect.fn(function*({
  ids,
}: {
  ids: NonEmptyHashSet.NonEmptyHashSet<string>
}) {
  const resolver = yield* DeleteProductByIdOut.DeleteProductById

  yield* Effect.logInfo('Requested to delete products')
  yield* Effect.logInfo('Attempting to delete products...')
  const maybeDeleteResults = yield* pipe(
    ids,
    HashSet.map((id) =>
      DeleteProductByIdOut.Request({
        id,
      })
    ),
    Effect.forEach(Effect.request(resolver), {
      concurrency: 'unbounded',
    }),
    Effect.option,
  )
  if (Opt.isNone(maybeDeleteResults)) {
    return Message.DeleteProductsCompleted()
  }
  yield* Effect.logInfo('Products deleted')
  return Message.DeleteProductsCompleted()
}, Effect.withLogSpan('DeleteAndGetProducts'))

export const addProduct = Effect.fn(function*(
  productData: AddProductIn.Params,
) {
  const { resolver } = yield* AddProductOut.AddProduct
  const current = yield* DateTime.now
  const maybeProduct = Product.makeProduct({
    maybeCreationDate: Opt.some(current),
    maybeExpirationDate: productData.maybeExpirationDate,
    maybeName: productData.maybeName,
  })
  if (Opt.isNone(maybeProduct)) {
    yield* Effect.logError('Product is invalid')
    return Message.AddProductCompleted()
  }
  const product = maybeProduct.value
  yield* Effect.logInfo(
    `Attempting to add product "${Product.name(product)}"...`,
  )
  const id = yield* Effect.sync(() => uuidv4())
  const maybeResult = yield* pipe(
    AddProductOut.Request({ id, product: Product.toOutput(product) }),
    Effect.request(resolver),
    Effect.option,
  )
  if (Opt.isNone(maybeResult)) {
    return Message.AddProductCompleted()
  }
  yield* Effect.logInfo(
    `Successfully added product with id ${maybeResult.value}`,
  )
  return Message.AddProductCompleted()
})

export const notifyWrongState = Effect.fn(function*(message: { _tag: string }) {
  yield* Effect.logError(`Triggered ${message._tag} in wrong state`)
  return Message.NoOp()
})

export const notifyStale = Effect.fn(function*(message: { _tag: string }) {
  yield* Effect.logInfo(`Triggered stale ${message._tag}`)
  return Message.NoOp()
})
