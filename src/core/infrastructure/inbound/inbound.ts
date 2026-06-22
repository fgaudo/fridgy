import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as PubSub from 'effect/PubSub'
import * as Stream from 'effect/Stream'
import { Events } from '@/feature/home/application/inbound.ts'
import type { Message } from '@/feature/home/application/messages.ts'
import { EventPublisher } from '@/feature/home/view/event-publisher.ts'

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
    Layer.succeed(EventPublisher, PubSub.publishUnsafe),
  )
}))
