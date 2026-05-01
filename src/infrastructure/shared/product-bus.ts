import * as Context from 'effect/Context'
import * as PubSub from 'effect/PubSub'
import type { RawProductDTO } from '@/app/shared/product.ts'

export class ProductBus extends Context.Service<ProductBus>()(
  '4b0a93da9ae04836',
  {
    make: PubSub.unbounded<ReadonlyArray<RawProductDTO>>(),
  },
) {}
