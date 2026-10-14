import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class GetSayings extends Context.Service<
	GetSayings,
	Effect.Effect<ReadonlyArray<string>>
>()('0609a243f96b9dc6') {}
