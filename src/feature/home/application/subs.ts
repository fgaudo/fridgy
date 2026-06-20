import * as Arr from 'effect/Array'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import type * as StateManager from '@/shared/fsm.ts'
import * as NormalizedString from '@/shared/normalized-string.ts'
import * as Product from '../domain/product.ts'
import * as AddProductIn from './inbound/add-product.ts'
import * as DeleteProductsByIdsIn from './inbound/delete-products-by-ids.ts'
import * as ProductsReadIn from './inbound/products-read.ts'
import { ViewportEvents } from './inbound/viewport-events.ts'
import { Message } from './messages.ts'
import type { State } from './model.ts'

type UseCases =
  | ViewportEvents
  | ProductsReadIn.ProductsRead
  | DeleteProductsByIdsIn.DeleteProductsByIds
  | AddProductIn.AddProduct

type ProductRawDTO = Opt.Option.Value<
  Result.Result.Success<
    Data.TaggedEnum.Value<Message, 'ProductsChanged'>['result']
  >
>[0]

const mapRawToDto = Effect.fn(
  function*(dtos: ReadonlyArray<ProductsReadIn.RawProductDTO>): Effect.fn.Return<ReadonlyArray<ProductRawDTO>> {
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

export const subscriptions: StateManager.Emitter<
  State,
  Message,
  UseCases
> = (state: State) => {
  const map: ReturnType<typeof subscriptions> = HashMap.make(
    [
      'products',
      Effect.service(ProductsReadIn.ProductsRead).pipe(
        Effect.map(({ change$ }) => change$),
        Stream.unwrap,
        Stream.zipLatest(Stream.tick('30 seconds')),
        Stream.mapEffect(Effect.fn(function*([result]) {
          if (Result.isFailure(result)) {
            return Message.ProductsChanged({ result: Result.fail(undefined) })
          }
          const entries = yield* mapRawToDto(result.success)
          return Message.ProductsChanged({
            result: Result.succeed(
              Arr.isReadonlyArrayNonEmpty(entries)
                ? Opt.some(entries)
                : Opt.none(),
            ),
          })
        })),
      ),
    ],
    [
      'delete',
      Effect.service(DeleteProductsByIdsIn.DeleteProductsByIds).pipe(
        Stream.unwrap,
        Stream.map(({ ids }) => Message.DeleteStarted({ ids })),
      ),
    ],
    [
      'add',
      Effect.service(AddProductIn.AddProduct).pipe(
        Stream.unwrap,
        Stream.map((input) => Message.AddProductStarted(input)),
      ),
    ],
    [
      'activity',
      Effect.service(ViewportEvents).pipe(
        Effect.map(({ isInteracting$ }) => isInteracting$),
        Stream.unwrap,
        Stream.map((isInteracting) => Message.InteractionChanged({ isInteracting })),
      ),
    ],
    [
      'isWindowTop',
      Effect.service(ViewportEvents).pipe(
        Effect.map(({ isAtTop$ }) => isAtTop$),
        Stream.unwrap,
        Stream.map((isAtTop) => Message.ViewportAtTopChanged({ isAtTop })),
      ),
    ],
    [
      'isWindowCloseToTop',
      Effect.service(ViewportEvents).pipe(
        Effect.map(({ isCloseToTop$ }) => isCloseToTop$),
        Stream.unwrap,
        Stream.map((isCloseToTop) => Message.ViewportCloseToTopChanged({ isCloseToTop })),
      ),
    ],
  )

  return map
}
