import * as Arr from 'effect/Array'
import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as GetProductsPort from '@/app/ports/outbound/product/get-products.ts'
import * as Product from '@/domain/product.ts'
import * as NormalizedString from '@/shared/normalized-string.ts'
import type * as UnitInterval from '@/shared/unit-interval.ts'

export type ProductDTO = Data.TaggedEnum<{
  Invalid: {
    maybeName: Option.Option<string>
    maybeId: Option.Option<string>
  }
  Valid: {
    id: string
    name: string
    status: Data.TaggedEnum<{
      Everlasting: object
      Stale: {
        expirationDate: DateTime.Zoned
      }
      Fresh: {
        freshnessRatio: UnitInterval.UnitInterval
        timeLeft: Duration.Duration
        expirationDate: DateTime.Zoned
      }
    }>
  }
}>

export const Status = Data.taggedEnum<Data.TaggedEnum.Value<ProductDTO, 'Valid'>['status']>()

export const ProductDTO = Data.taggedEnum<ProductDTO>()

export type Response = Data.TaggedEnum<{
  Succeeded: {
    maybeProducts: Option.Option<Arr.NonEmptyArray<ProductDTO>>
  }
  Failed: object
}>
export const Response = Data.taggedEnum<Response>()

export class GetProducts extends Context.Service<GetProducts>()(
  '35e20eea1cce74d0',
  {
    make: Effect.gen(function*() {
      const getProducts = yield* GetProductsPort.GetProducts

      // @effect-diagnostics-next-line returnEffectInGen:off
      return Effect.gen(function*(): Effect.fn.Return<Response, never, DateTime.CurrentTimeZone> {
        yield* Effect.log('Started')
        const maybeProducts = yield* Effect.option(getProducts)
        if (Option.isNone(maybeProducts)) {
          yield* Effect.logError('Could not receive products')
          return Response.Failed()
        }
        const currentDate = yield* DateTime.nowInCurrentZone
        const entries = yield* Effect.forEach(
          maybeProducts.value,
          Effect.fn(function*(productData) {
            const result = Option.all([
              productData.maybeId,
              Product.makeProduct(productData),
            ])
            if (Option.isNone(result)) {
              return ProductDTO.Invalid({
                maybeId: productData.maybeId,
                maybeName: Option.map(productData.maybeName, (string) =>
                  NormalizedString.fromString(string).pipe(
                    Option.getOrElse(() => '[Invalid name]'),
                  )),
              })
            }
            const [id, product] = result.value
            const maybeExpiration = Product.maybeExpiration(product)
            if (Option.isNone(maybeExpiration)) {
              return ProductDTO.Valid({
                id,
                name: Product.name(product),
                status: Status.Everlasting(),
              })
            }
            const status = Product.expirationStatus(currentDate)(
              maybeExpiration.value,
            )
            if (status.hasExpired) {
              return ProductDTO.Valid({
                id,
                name: Product.name(product),
                status: Status.Stale({
                  expirationDate: Product.expirationDate(maybeExpiration.value),
                }),
              })
            }
            return ProductDTO.Valid({
              id,
              name: Product.name(product),
              status: Status.Fresh({
                expirationDate: Product.expirationDate(maybeExpiration.value),
                freshnessRatio: status.freshness,
                timeLeft: status.timeLeft,
              }),
            })
          }),
        )
        return Response.Succeeded({
          maybeProducts: Arr.isArrayNonEmpty(entries)
            ? Option.some(entries)
            : Option.none(),
        })
      }).pipe(Effect.withLogSpan('GetProducts'))
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
