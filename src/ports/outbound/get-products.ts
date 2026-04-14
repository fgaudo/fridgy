import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Opt from 'effect/Option'

import type { ProductInput } from '../../domain/product'

export type Result = Array<
	ProductInput & {
		maybeId: Opt.Option<string>
	}
>

export class GetProducts extends Context.Service<
	GetProducts,
	Effect.Effect<Result, void>
>()('62b70982a11e3c4f') {}
