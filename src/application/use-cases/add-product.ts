import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import { v4 as uuidv4 } from 'uuid'
import { AddProduct, type Params } from '@/app/ports/inbound/add-product.ts'
import * as AddProductPort from '@/app/ports/outbound/product/add-product.ts'
import * as Product from '@/domain/product.ts'

export const layer = Layer.effect(
  AddProduct,
  Effect.gen(function*() {
    const resolver = yield* AddProductPort.AddProduct
    return Effect.fn(function*(
      productData: Params,
    ) {
      const current = yield* DateTime.now
      const maybeProduct = Product.makeProduct({
        maybeCreationDate: Option.some(current),
        maybeExpirationDate: productData.maybeExpirationDate,
        maybeName: productData.maybeName,
      })
      if (Option.isNone(maybeProduct)) {
        yield* Effect.logError('Product is invalid')
        return yield* Effect.fail(undefined)
      }
      const product = maybeProduct.value
      yield* Effect.logInfo(
        `Attempting to add product "${Product.name(product)}"...`,
      )
      const id = yield* Effect.sync(() => uuidv4())
      const maybeResult = yield* pipe(
        AddProductPort.Request({ id, product: Product.toOutput(product) }),
        Effect.request(resolver),
        Effect.option,
      )
      if (Option.isNone(maybeResult)) {
        return yield* Effect.fail(undefined)
      }
      yield* Effect.logInfo(
        `Successfully added product with id ${maybeResult.value}`,
      )
    }, Effect.withLogSpan('AddProduct'))
  }),
)
