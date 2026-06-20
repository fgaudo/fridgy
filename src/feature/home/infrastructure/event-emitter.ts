import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import * as PubSub from 'effect/PubSub'
import * as Stream from 'effect/Stream'
import type { Message } from '@/feature/home/application/messages.ts'

export class EventEmitter extends Context.Service<
  EventEmitter,
  PubSub.PubSub<Message>
>()('afba9f1cf45e969b') {}
