import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Home from '@/feature/home/application/messages.ts'

export class Dispatcher extends Context.Service<
  Dispatcher,
  (m: Message) => void
>()('96a8693bd80d2625') {}

export type Message = Data.TaggedEnum<{
  HideSplashScreenRequested: object
  GotHomeMsg: { message: Home.Message }
}>

export const Message = Data.taggedEnum<Message>()

export type InternalMessage =
  | Message
  | Data.TaggedEnum<
    {
      GotHomeMsg: { message: Home.InternalMessage }
      NoOp: object
      Crash: { error: unknown }
    }
  >

export const InternalMessage = Data.taggedEnum<InternalMessage>()
