import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as ServiceMap from 'effect/ServiceMap'

import * as Integer from '@/core/integer/integer.ts'

export type Result = {
	maybeId: Opt.Option<string>
	maybeName: Opt.Option<string>
	maybeCreationDate: Opt.Option<Integer.Integer>
	maybeExpirationDate: Opt.Option<Integer.Integer>
}[]

export class GetProducts extends ServiceMap.Service<
	GetProducts,
	{
		run: Effect.Effect<Result, void>
	}
>()('ce4353b7df5e79f4') {}
