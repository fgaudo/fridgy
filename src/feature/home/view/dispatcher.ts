import * as Context from 'effect/Context'
import type { Message } from '@/feature/home/application/messages.ts'

export class Dispatcher extends Context.Service<
  Dispatcher,
  (m: Message) => void
>()('168b78c71c0f0d4f') {}
