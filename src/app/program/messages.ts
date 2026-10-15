import * as Data from 'effect/Data'
import type * as About from '../pages/about/program.ts'
import type * as Home from '../pages/home/program.ts'

export type Message = Data.TaggedEnum<{
  GotHomeMsg: { message: Home.Message }
  GotAboutMsg: { message: About.Message }
  BackRequested: object
}>

export const Message = Data.taggedEnum<Message>()
