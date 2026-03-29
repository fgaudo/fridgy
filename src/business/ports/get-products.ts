import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as ServiceMap from 'effect/ServiceMap'

import type { ProductInput } from '@/business/domain/product.ts'

export type Result = (ProductInput & {
	maybeId: Opt.Option<string>
})[]

export class GetProducts extends ServiceMap.Service<
	GetProducts,
	Effect.Effect<Result, void>
>()('48b38a588f884c0a') {}
