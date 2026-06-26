import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as PubSub from 'effect/PubSub'
import * as Stream from 'effect/Stream'
import { Events } from '@/core/application/inbound.ts'
import { Dispatcher, type Message } from '@/core/application/messages.ts'

export const inbound = Layer.unwrap(Effect.gen(function*() {
  const pubsub = yield* PubSub.unbounded<
    Message
  >()
  return Layer.mergeAll(
    Layer.succeed(
      Events,
      Stream.mergeAll([
        Stream.fromPubSub(pubsub),
      ], { concurrency: 'unbounded' }),
    ),
    Layer.succeed(Dispatcher, PubSub.publishUnsafe),
  )
}))
