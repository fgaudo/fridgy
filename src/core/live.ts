import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as PubSub from 'effect/PubSub'
import * as Stream from 'effect/Stream'
import { Events } from '@/core/application/inbound.ts'
import { Dispatcher, type Message } from '@/core/application/messages.ts'
import { layer } from '@/core/infrastructure/ui-commands/live.ts'

const events = Layer.unwrap(Effect.gen(function*() {
  const pubsub = yield* PubSub.unbounded<
    Message
  >()
  return Layer.mergeAll(
    Layer.succeed(Events, Stream.fromPubSub(pubsub)),
    Layer.succeed(Dispatcher, (m) => PubSub.publishUnsafe(pubsub, m)),
  )
}))

export const live = Layer.mergeAll(layer, events)
