import type * as Effect from 'effect/Effect'
import type * as Opt from 'effect/Option'
import * as ServiceMap from 'effect/ServiceMap'

import type { ProductInput } from '@/business/domain/product.ts'

export type Result = Array<
	ProductInput & {
		maybeId: Opt.Option<string>
	}
>

export class GetProducts extends ServiceMap.Service<
	GetProducts,
	Effect.Effect<Result, void>
>()('289563321ab115e7') {}
