import * as Context from 'effect/Context'
import type { Message } from '@/feature/home/application/messages.ts'

export class Dispatcher extends Context.Service<
  Dispatcher,
  (m: Message) => void
>()('168e79c9c16c9350') {}
