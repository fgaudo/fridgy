import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

export type ViewModel<S, M1, M2, R> = {
	initState: S
	messages: Stream.Stream<M2>
	stateChanges: Stream.Stream<S>
	run: Effect.Effect<
		{
			dispatch: (m: M1) => Effect.Effect<void>
			dispose: Effect.Effect<void>
		},
		never,
		R
	>
}
