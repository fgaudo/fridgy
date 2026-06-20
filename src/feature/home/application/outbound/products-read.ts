import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Opt from 'effect/Option'
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
    get: Effect.Effect<RawProductDTO>
  }
>()('029c944af02b9e7f') {}
