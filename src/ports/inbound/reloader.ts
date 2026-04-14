import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'

export class Reloader extends Context.Service<
	Reloader,
	{
		readonly changes: Stream.Stream<View>
	}
>()('c5ea4ed8b5f75416') {}
