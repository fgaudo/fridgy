import * as Data from 'effect/Data'

import type * as Home from './home/messages.ts'

export type Message = Data.TaggedEnum<{
  GotHomeMsg: { message: Home.Message }
}>

export const Message = Data.taggedEnum<Message>()

export type InternalMessage =
  | Message
  | Data.TaggedEnum<
    {
      BackButtonPressed: object
      GotHomeMsg: { message: Home.InternalMessage }
      HideToast: { version: bigint }
      NoOp: object
      Crash: { error: unknown }
    }
  >

export const InternalMessage = Data.taggedEnum<InternalMessage>()
