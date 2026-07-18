import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as PubSub from 'effect/PubSub'
import * as Stream from 'effect/Stream'
import { Events } from '@/feature/home/application/inbound.ts'
import type { Message } from '@/feature/home/application/messages.ts'
import { addProductLayer } from '@/feature/home/infrastructure/add-product/live.ts'
import { deleteProductsLayer } from '@/feature/home/infrastructure/delete-product-by-ids/live.ts'
import { db } from '@/feature/home/infrastructure/events/db-listener.ts'
import { scroll } from '@/feature/home/infrastructure/events/scroll-listener.ts'
import { notificationLive } from '@/feature/home/infrastructure/notification/live.ts'
import { uiCommandsLive } from '@/feature/home/infrastructure/ui-commands/live.ts'
import { Dispatcher } from '@/feature/home/view/dispatcher.ts'

const events = Layer.unwrap(
  Effect.gen(function*() {
    const pubSub = yield* PubSub.unbounded<Message>()
    return Layer.mergeAll(
      Layer.succeed(
        Events,
        Stream.mergeAll([
          yield* db,
          scroll,
          Stream.fromPubSub(pubSub),
        ], { concurrency: 'unbounded' }),
      ),
      Layer.succeed(Dispatcher, (m: Message) => {
        PubSub.publishUnsafe(pubSub, m)
      }),
    )
  }),
)

export const home = Layer.mergeAll(
  events,
  addProductLayer,
  deleteProductsLayer,
  notificationLive,
  uiCommandsLive,
)
