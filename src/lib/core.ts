import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

export type ViewModel<S, M, R> = {
	initState: S
	run: Effect.Effect<
		{
			changes: Stream.Stream<S>
			dispatch: (m: M) => Effect.Effect<void>
			dispose: Effect.Effect<void>
		},
		never,
		R
	>
}
