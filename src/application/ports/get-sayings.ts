import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class GetSayings extends Context.Service<
	GetSayings,
	Effect.Effect<ReadonlyArray<string>>
>()('2b8cf17af2f4a71c') {}
