import * as Arr from 'effect/Array'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import type * as NonEmptyHashSet from '@/libs/collections/non-empty-hash-set.ts'
import * as NormalizedString from '@/libs/strings/normalized-string.ts'
import * as Product from '../domain/product.ts'
import { InternalMessage } from './messages.ts'
import type { OperationId } from './state.ts'
import { Notifications } from '../ports/notifications.ts'
import * as Products from '../ports/products.ts'
import { Viewport } from '../ports/viewport.ts'

const mapRawToDto = Effect.fn(
  function*(
    dtos: Result.Result.Success<
      Data.TaggedEnum.Value<InternalMessage, 'ProductsChanged'>['result']
    >,
  ) {
    const currentDate = yield* DateTime.now
    const entries = yield* Effect.forEach(
      dtos,
      Effect.fn(function*(productData) {
        const result = Opt.all([
          productData.maybeId,
          Product.makeProduct(productData),
        ])
        if (Opt.isNone(result)) {
          return {
            _tag: 'Invalid',
            maybeId: productData.maybeId,
            maybeName: Opt.map(productData.maybeName, (string) =>
              NormalizedString.fromString(string).pipe(
                Opt.getOrElse(() => '[Invalid name]'),
              )),
          } as const
        }
        const [id, product] = result.value
        const maybeExpiration = Product.maybeExpiration(product)
        if (Opt.isNone(maybeExpiration)) {
          return {
            _tag: 'Valid',
            id,
            name: Product.name(product),
            status: { _tag: 'Everlasting' },
          } as const
        }
        const status = Product.expirationStatus(currentDate)(
          maybeExpiration.value,
        )
        if (status.hasExpired) {
          return {
            _tag: 'Valid',
            id,
            name: Product.name(product),
            status: {
              _tag: 'Stale',
              expirationDate: Product.expirationDate(maybeExpiration.value),
            },
          } as const
        }
        return {
          _tag: 'Valid',
          id,
          name: Product.name(product),
          status: {
            _tag: 'Fresh',
            expirationDate: Product.expirationDate(maybeExpiration.value),
            freshnessRatio: status.freshness,
            timeLeft: status.timeLeft,
          },
        } as const
      }),
    )
    return entries
  },
)

export const validateProducts = Effect.fn(function*(
  validation: OperationId,
  inputs: Data.TaggedEnum.Value<InternalMessage, 'ProductsChanged'>['result'],
) {
  if (Result.isFailure(inputs)) {
    return InternalMessage.ProductsValidated({ validation, result: Result.fail(undefined) })
  }
  const results = yield* mapRawToDto(inputs.success)
  return InternalMessage.ProductsValidated({
    validation,
    result: Result.succeed(
      Arr.isReadonlyArrayNonEmpty(results)
        ? Opt.some(results)
        : Opt.none(),
    ),
  })
})

export const deleteProducts = Effect.fn(function*({
  operation,
  ids,
}: {
  operation: OperationId
  ids: NonEmptyHashSet.NonEmptyHashSet<string>
}) {
  const { deleteById } = yield* Products.Products
  yield* Effect.logInfo('Attempting to delete products...')
  const maybeDeleted = yield* pipe(
    ids,
    HashSet.map((id) => Products.DeleteProductById({ id })),
    Effect.forEach(Effect.request(deleteById), { concurrency: 'unbounded' }),
    Effect.option,
  )
  if (Opt.isNone(maybeDeleted)) {
    yield* Effect.logWarning('Could not delete products')
    return InternalMessage.DeleteProductsCompleted({ operation, succeeded: false })
  }
  yield* Effect.logInfo('Products deleted')
  return InternalMessage.DeleteProductsCompleted({ operation, succeeded: true })
}, Effect.withLogSpan('DeleteProducts'))

export const addProduct = Effect.fn(function*(
  operation: OperationId,
  productData: {
    maybeExpirationDate: Opt.Option<DateTime.Utc>
    maybeName: Opt.Option<string>
  },
) {
  const { add } = yield* Products.Products
  const current = yield* DateTime.now
  const maybeProduct = Product.makeProduct({
    maybeCreationDate: Opt.some(current),
    maybeExpirationDate: productData.maybeExpirationDate,
    maybeName: productData.maybeName,
  })
  if (Opt.isNone(maybeProduct)) {
    yield* Effect.logWarning('Product is invalid')
    return InternalMessage.AddProductCompleted({ operation, succeeded: false })
  }
  const product = maybeProduct.value
  yield* Effect.logInfo(`Attempting to add product "${Product.name(product)}"...`)
  const maybeId = yield* pipe(
    Products.AddProduct({ product: Product.toOutput(product) }),
    Effect.request(add),
    Effect.option,
  )
  if (Opt.isNone(maybeId)) {
    yield* Effect.logWarning('Could not add the product')
    return InternalMessage.AddProductCompleted({ operation, succeeded: false })
  }
  yield* Effect.logInfo(`Successfully added product with id ${maybeId.value}`)
  return InternalMessage.AddProductCompleted({ operation, succeeded: true })
})

export const scrollToTop = Effect.gen(function*() {
  const { scrollToTop } = yield* Viewport
  yield* scrollToTop
  return InternalMessage.NoOp()
})

export const showToast = Effect.fn(function*(text: string) {
  const { showToast } = yield* Notifications
  yield* showToast(text).pipe(
    Effect.catchTag('NotificationError', (error) => Effect.logWarning('Could not show toast', error.cause)),
  )
  return InternalMessage.NoOp()
})
