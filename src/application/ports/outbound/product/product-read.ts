import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Result from 'effect/Result'
import type * as Stream from 'effect/Stream'
import type { RawProductDTO } from '@/app/shared/product.ts'

export type ProductsDTO = ReadonlyArray<
  RawProductDTO
>

export class ProductRead extends Context.Service<
  ProductRead,
  {
    get: Effect.Effect<ProductsDTO, void>
    change$: Stream.Stream<Result.Result<ProductsDTO, void>>
  }
>()('ee957e248510a6fe') {}
