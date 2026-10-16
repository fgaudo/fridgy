import type * as Tea from '@fgaudo/effect-tea'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

/**
 * Runs a stream that promises never to end as a subscription, each value becoming a message. The type of a
 * stream cannot hold that promise, so it is checked here: a stream that ends dies.
 */
export const toSubscription =
  <Message, R>(stream: Stream.Stream<Message, never, R>): Tea.Subscription<Message, R> => (emit) =>
    Stream.runForEach(stream, emit).pipe(Effect.andThen(Effect.die(new Error('A subscribed stream ended'))))
