import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

import type { Message } from '@/app/core/messages.ts'

export class MessageDispatcher extends Context.Service<
  MessageDispatcher,
  (m: Message) => Effect.Effect<void>
>()('0b011bae6e3a6a1f') {}
