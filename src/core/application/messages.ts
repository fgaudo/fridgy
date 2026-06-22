import * as Data from 'effect/Data'

import type * as Home from '@/feature/home/application/messages.ts'

export type Message = Data.TaggedEnum<{
  HideSplashScreenRequested: object
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
