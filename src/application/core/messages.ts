import * as Data from 'effect/Data'

import type * as Home from './home/messages.ts'

export type InternalMessage =
  | Home.Message
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
