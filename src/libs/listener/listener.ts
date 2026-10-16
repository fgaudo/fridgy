import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

/**
 * A source that never ends, as its success type says: it sends values with `emit` until it is interrupted.
 * A process that ends (a download) is a `Stream` instead, whose end means something.
 */
export type Listener<A, R = never> = (emit: (value: A) => Effect.Effect<void>) => Effect.Effect<never, never, R>

/** Listens to a stream: it sends each value, and once the stream ends, it keeps listening to nothing. */
export const fromStream = <A, R>(stream: Stream.Stream<A, never, R>): Listener<A, R> => (emit) =>
  Stream.runForEach(stream, emit).pipe(Effect.andThen(Effect.never))
