import * as Data from 'effect/Data'
import * as Match from 'effect/Match'
import type * as About from '#app/pages/about/program.ts'
import type * as Home from '#app/pages/home/program.ts'

export type Message = Data.TaggedEnum<{
  GotHomeMsg: { message: Home.Message }
  GotAboutMsg: { message: About.Message }
  BackRequested: object
}>

export const Message = Data.taggedEnum<Message>()

/** A message as the logs show it: its tags (e.g. `GotHomeMsg › ItemSelected`), without its data. */
export const describeMessage = Match.typeTags<Message, string>()({
  GotHomeMsg: ({ message }) => `GotHomeMsg › ${message._tag}`,
  GotAboutMsg: ({ message }) => `GotAboutMsg › ${message._tag}`,
  BackRequested: () => 'BackRequested',
})
