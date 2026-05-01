import type * as Opt from 'effect/Option'
import type { ProductInput } from '@/domain/product.ts'

export type RawProductDTO = ProductInput & {
  maybeId: Opt.Option<string>
}
