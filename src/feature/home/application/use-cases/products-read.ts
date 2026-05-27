import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import { ProductDTO, ProductsRead } from '../../feature/home/application/ports/inbound/products-read'
import * as ProductsReadOut from '../../feature/home/application/ports/outbound/product/products-read'
import * as Product from '../../domain/product'
import * as NormalizedString from '@/shared/normalized-string.ts'

export const Status = Data.taggedEnum<Data.TaggedEnum.Value<ProductDTO, 'Valid'>['status']>()

const mapRawToDto = Effect.fn(
  function*(dtos: ReadonlyArray<ProductsReadOut.RawProductDTO>): Effect.fn.Return<ReadonlyArray<ProductDTO>> {
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

export const productsRead = Layer.effect(
  ProductsRead,
  Effect.gen(function*() {
    const { get, change$ } = yield* ProductsReadOut.ProductsRead
    // @effect-diagnostics-next-line returnEffectInGen:off
    return {
      get: Effect.gen(function*() {
        yield* Effect.log('Started')
        const maybeProducts = yield* Effect.option(get)
        if (Option.isNone(maybeProducts)) {
          yield* Effect.logError('Could not receive products')
          return yield* Effect.fail(undefined)
        }
        const entries = yield* mapRawToDto(maybeProducts.value)
        return {
          maybeProducts: Arr.isReadonlyArrayNonEmpty(entries)
            ? Option.some(entries)
            : Option.none(),
        }
      }),
      changes: (refresh$: Stream.Stream<void>) =>
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
        ),
    }
  }),
)
