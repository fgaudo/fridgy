import * as Context from 'effect/Context'
import type { Message } from '@/core/application/messages.ts'

export class EventPublisher extends Context.Service<
  EventPublisher,
  (m: Message) => void
>()('c0b1a69ae71d330d') {}
