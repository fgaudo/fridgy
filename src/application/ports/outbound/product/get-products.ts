import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Opt from 'effect/Option'

import type { ProductInput } from '@/domain/product.ts'

export type Result = Array<
	ProductInput & {
		maybeId: Opt.Option<string>
	}
>

export class GetProducts extends Context.Service<
	GetProducts,
	Effect.Effect<Result, void>
>()('e4494b55203c3e5d') {}
