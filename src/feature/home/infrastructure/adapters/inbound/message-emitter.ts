import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as PubSub from 'effect/PubSub'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import { v4 as uuidv4 } from 'uuid'
import { Message, type Message } from '@/feature/home/application/messages.ts'
import { MessageEmitter } from '@/feature/home/application/services/inbound/message-emitter.ts'
import { EventEmitter } from '@/feature/home/infrastructure/event-emitter.ts'

export const layer = Layer.effect(
  MessageEmitter,
  Effect.gen(function*() {
    const pubSub = yield* EventEmitter
    return Stream.fromPubSub(pubSub)
  }),
)
