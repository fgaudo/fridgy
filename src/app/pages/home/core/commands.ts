import * as Arr from 'effect/Array'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as Crypto from 'effect/Crypto'
import type * as NonEmptyHashSet from '@/libs/non-empty-hash-set.ts'
import * as NormalizedString from '@/libs/normalized-string.ts'
import * as Product from '../domain/product.ts'
import { InternalMessage } from './messages.ts'
import * as DeleteProductById from '@/app/pages/home/ports/delete-product-by-id.ts'
import * as AddProduct from '@/app/pages/home/ports/add-product.ts'

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
  inputs: Data.TaggedEnum.Value<InternalMessage, 'ProductsChanged'>['result'],
) {
  if (Result.isFailure(inputs)) {
    return InternalMessage.ProductsValidated({ result: Result.fail(undefined) })
  }
  const results = yield* mapRawToDto(inputs.success)
  return InternalMessage.ProductsValidated({
    result: Result.succeed(
      Arr.isReadonlyArrayNonEmpty(results)
        ? Opt.some(results)
        : Opt.none(),
    ),
  })
})

export const deleteProducts = Effect.fn(function*({
  ids,
}: {
  ids: NonEmptyHashSet.NonEmptyHashSet<string>
}) {
  const { resolver } = yield* DeleteProductById.DeleteProductById

  yield* Effect.logInfo('Requested to delete products')
  yield* Effect.logInfo('Attempting to delete products...')
  const maybeDeleteResults = yield* pipe(
    ids,
    HashSet.map((id) =>
      DeleteProductById.Request({
        id,
      })
    ),
    Effect.forEach(Effect.request(resolver), {
      concurrency: 'unbounded',
    }),
    Effect.option,
  )
  if (Opt.isNone(maybeDeleteResults)) {
    return InternalMessage.DeleteProductsCompleted()
  }
  yield* Effect.logInfo('Products deleted')
  return InternalMessage.DeleteProductsCompleted()
}, Effect.withLogSpan('DeleteAndGetProducts'))

export const addProduct = Effect.fn(function*(
  productData: {
    maybeExpirationDate: Opt.Option<DateTime.Utc>
    maybeName: Opt.Option<string>
  },
) {
  const { resolver } = yield* AddProduct.AddProduct
  const current = yield* DateTime.now
  const maybeProduct = Product.makeProduct({
    maybeCreationDate: Opt.some(current),
    maybeExpirationDate: productData.maybeExpirationDate,
    maybeName: productData.maybeName,
  })
  if (Opt.isNone(maybeProduct)) {
    yield* Effect.logError('Product is invalid')
    return InternalMessage.AddProductCompleted()
  }
  const product = maybeProduct.value
  yield* Effect.logInfo(
    `Attempting to add product "${Product.name(product)}"...`,
  )
  const crypto = yield* Crypto.Crypto
  const id = yield* crypto.randomUUIDv4
  const maybeResult = yield* pipe(
    AddProduct.Request({ id, product: Product.toOutput(product) }),
    Effect.request(resolver),
    Effect.option,
  )
  if (Opt.isNone(maybeResult)) {
    return InternalMessage.AddProductCompleted()
  }
  yield* Effect.logInfo(
    `Successfully added product with id ${maybeResult.value}`,
  )
  return InternalMessage.AddProductCompleted()
})

export const notifyWrongState = Effect.fn(function*(message: { _tag: string }) {
  yield* Effect.logError(`Triggered ${message._tag} in wrong state`)
  return InternalMessage.NoOp()
})

export const notifyStale = Effect.fn(function*(message: { _tag: string }) {
  yield* Effect.logInfo(`Triggered stale ${message._tag}`)
  return InternalMessage.NoOp()
})

export const scrollToTop = Effect.gen(function*() {
  const { scrollToTop } = yield* UiCommands
  yield* scrollToTop
  return InternalMessage.NoOp()
})

export const showToast = Effect.fn(function*(message: string) {
  const { showToast } = yield* Notification.Notification
  yield* showToast(message)
  return InternalMessage.NoOp()
})
