import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'
import type { Message } from '@/feature/home/application/messages.ts'

export class Events extends Context.Service<
  Events,
  Stream.Stream<Message>
>()('85200d8e3e653b70') {}
