import * as Channel from 'effect/Channel'
import * as Stream from 'effect/Stream'

/**
 * Values over time that end with `Done`: a result for a process that ends (a download ends with its file),
 * `never` for a source that never ends (database changes). It is an Effect `Channel` that takes no input,
 * run with `Channel.runForEach` and transformed with `Channel.map`, `Channel.filter`…, which keep `Done`.
 */
export type Source<A, Done, E = never, R = never> = Channel.Channel<A, E, Done, unknown, unknown, unknown, R>

/**
 * A stream, as a source that never ends: it sends each value, and once the stream has ended, it keeps
 * listening to nothing. For adapters built on a library's stream, whose type cannot say how it ends.
 */
export const fromStream = <A, R>(stream: Stream.Stream<A, never, R>): Source<A, never, never, R> =>
  Stream.toChannel(stream).pipe(
    Channel.flattenArray,
    Channel.concatWith(() => Channel.never),
  )
