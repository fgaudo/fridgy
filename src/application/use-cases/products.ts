import * as Arr from 'effect/Array'
import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import * as ProductRead from '@/app/ports/outbound/product/product-read.ts'
import type { RawProductDTO } from '@/app/shared/product.ts'
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
        expirationDate: DateTime.Utc
      }
      Fresh: {
        freshnessRatio: UnitInterval.UnitInterval
        timeLeft: Duration.Duration
        expirationDate: DateTime.Utc
      }
    }>
  }
}>

export const Status = Data.taggedEnum<Data.TaggedEnum.Value<ProductDTO, 'Valid'>['status']>()

export const ProductDTO = Data.taggedEnum<ProductDTO>()

export type Response = Result.Result<{
  maybeProducts: Option.Option<Arr.NonEmptyReadonlyArray<ProductDTO>>
}, void>

const mapRawToDto = Effect.fn(
  function*(dtos: ReadonlyArray<RawProductDTO>): Effect.fn.Return<ReadonlyArray<ProductDTO>> {
    const currentDate = yield* DateTime.now
    const entries = yield* Effect.forEach(
      dtos,
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
    return entries
  },
)

export class GetProducts extends Context.Service<GetProducts>()(
  '9bcfd8f6b11a7039',
  {
    make: Effect.gen(function*() {
      const { get } = yield* ProductRead.ProductRead
      // @effect-diagnostics-next-line returnEffectInGen:off
      return Effect.gen(function*(): Effect.fn.Return<Response> {
        yield* Effect.log('Started')
        const maybeProducts = yield* Effect.option(get)
        if (Option.isNone(maybeProducts)) {
          yield* Effect.logError('Could not receive products')
          return Result.fail(undefined)
        }
        const entries = yield* mapRawToDto(maybeProducts.value)
        return Result.succeed({
          maybeProducts: Arr.isReadonlyArrayNonEmpty(entries)
            ? Option.some(entries)
            : Option.none(),
        })
      }).pipe(Effect.withLogSpan('GetProducts'))
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}

export class ProductChanges extends Context.Service<ProductChanges>()(
  'f6ee461502dc6ee6',
  {
    make: Effect.gen(function*() {
      const { change$ } = yield* ProductRead.ProductRead
      return (refresh$: Stream.Stream<void>) =>
        Stream.zipLatestAll(change$, refresh$).pipe(
          Stream.mapEffect(Effect.fn(function*([result]) {
            if (Result.isFailure(result)) {
              return Result.fail(undefined)
            }
            const entries = yield* mapRawToDto(result.success)
            return Result.succeed({
              maybeProducts: Arr.isReadonlyArrayNonEmpty(entries)
                ? Option.some(entries)
                : Option.none(),
            })
          })),
        )
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
