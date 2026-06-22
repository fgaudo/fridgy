import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'
import type { Message } from '@/core/application/messages.ts'

export class Events extends Context.Service<
  Events,
  Stream.Stream<Message>
>()('4b53e750407ab8d6') {}
