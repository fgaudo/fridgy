import * as Data from 'effect/Data'
import type * as About from '../pages/about/program.ts'
import type * as Home from '../pages/home/program.ts'

export type InternalMessage = Data.TaggedEnum<{
  GotHomeMsg: { message: Home.InternalMessage }
  GotAboutMsg: { message: About.InternalMessage }
  /** Android's back button. */
  BackRequested: object
}>

export const InternalMessage = Data.taggedEnum<InternalMessage>()

export type Message = InternalMessage
