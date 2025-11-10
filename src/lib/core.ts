import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

export type ViewModel<S, M, R> = {
	initState: S
	setup: Effect.Effect<{
		changes: Stream.Stream<S>
		run: Effect.Effect<
			{
				dispose: Effect.Effect<void>
				dispatch: (m: M) => Effect.Effect<void>
			},
			never,
			R
		>
	}>
}
