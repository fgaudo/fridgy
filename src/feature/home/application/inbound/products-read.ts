import * as Context from 'effect/Context'
import type * as Opt from 'effect/Option'
import type * as Result from 'effect/Result'
import type * as Stream from 'effect/Stream'
import type { ProductInput } from '@/feature/home/domain/product.ts'

export type RawProductDTO = ProductInput & {
  maybeId: Opt.Option<string>
}

export type ProductsDTO = ReadonlyArray<
  RawProductDTO
>

export class ProductsRead extends Context.Service<
  ProductsRead,
  {
    change$: Stream.Stream<Result.Result<ProductsDTO, void>>
  }
>()('66ee70be4a6fe860') {}
