import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import type * as Result from 'effect/Result'
import type * as Stream from 'effect/Stream'
import type { ProductInput } from '../../../../domain/product'

export type RawProductDTO = ProductInput & {
  maybeId: Opt.Option<string>
}

export type ProductsDTO = ReadonlyArray<
  RawProductDTO
>

export class ProductsRead extends Context.Service<
  ProductsRead,
  {
    get: Effect.Effect<ProductsDTO, void>
    change$: Stream.Stream<Result.Result<ProductsDTO, void>>
  }
>()('04298e8f41c09189') {}
