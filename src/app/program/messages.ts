import * as Data from 'effect/Data'
import type * as Home from '../pages/home/program.ts'

export type InternalMessage = Data.TaggedEnum<{
  GotHomeMsg: { message: Home.InternalMessage }
}>

export const InternalMessage = Data.taggedEnum<InternalMessage>()

/** The root has no messages of its own yet: it only carries the pages' ones. */
export type Message = InternalMessage
