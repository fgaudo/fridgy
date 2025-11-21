import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

export type ViewModel<S, M1, M2> = {
	initState: S
	messages: Stream.Stream<M2>
	changes: Stream.Stream<S>
	dispatch: (m: M1) => Effect.Effect<void>
	dispose: Effect.Effect<void>
}
