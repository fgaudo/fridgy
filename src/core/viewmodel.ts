import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

export type ViewModel<S, M, R> = {
	messages: Stream.Stream<M>
	stateChanges: Stream.Stream<S>
	start: Effect.Effect<void, never, R>
	dispose: Effect.Effect<void>
}
