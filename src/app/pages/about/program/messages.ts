import * as Data from 'effect/Data'
import type * as Opt from 'effect/Option'
import type { License } from '../ports/licenses.ts'

export type Message = Data.TaggedEnum<{
  LicensesLoaded: { licenses: ReadonlyArray<License> }
  SayingPicked: { maybeSaying: Opt.Option<string> }
  /** From the back button, in the page or Android's. */
  BackPressed: object
}>

export const Message = Data.taggedEnum<Message>()

/** The page has no messages of its own beyond the public ones yet. */
export type InternalMessage = Message

export const InternalMessage = Message

/** What the page asks of its parent (the "OutMsg" pattern). */
export type Event = Data.TaggedEnum<{
  LeaveRequested: object
}>

export const Event = Data.taggedEnum<Event>()
