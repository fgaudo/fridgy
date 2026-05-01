import * as Context from 'effect/Context'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Result from 'effect/Result'
import { v4 as uuidv4 } from 'uuid'
import * as AddProductPort from '@/app/ports/outbound/product/add-product.ts'
import * as Product from '@/domain/product.ts'

export type Params = {
  maybeName: Option.Option<string>
  maybeExpirationDate: Option.Option<DateTime.Utc>
}

export class AddProduct extends Context.Service<AddProduct>()(
  '1c97d4e969af3275',
  {
    make: Effect.gen(function*() {
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
          return Result.fail(undefined)
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
          return Result.fail(undefined)
        }
        yield* Effect.logInfo(
          `Successfully added product with id ${maybeResult.value}`,
        )
        return Result.succeed(undefined)
      }, Effect.withLogSpan('AddProduct'))
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
