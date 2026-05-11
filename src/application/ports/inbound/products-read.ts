import type * as Arr from 'effect/Array'
import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import type * as Effect from 'effect/Effect'
import type * as Opt from 'effect/Option'
import type * as Result from 'effect/Result'
import type * as Stream from 'effect/Stream'
import type * as UnitInterval from '@/shared/unit-interval.ts'

export type ProductDTO = Data.TaggedEnum<{
  Invalid: {
    maybeName: Opt.Option<string>
    maybeId: Opt.Option<string>
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

export const ProductDTO = Data.taggedEnum<ProductDTO>()

export type Response = {
  maybeProducts: Opt.Option<Arr.NonEmptyReadonlyArray<ProductDTO>>
}

export class ProductsRead extends Context.Service<
  ProductsRead,
  {
    get: Effect.Effect<Response, void>
    changes: (refresh: Stream.Stream<void>) => Stream.Stream<Result.Result<Response, void>>
  }
>()('5d52d90b72596b61') {}
