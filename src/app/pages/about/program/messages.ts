import * as Data from 'effect/Data'
import type * as Opt from 'effect/Option'
import type { License } from '../ports/licenses.ts'

/** What the parent may send to the page: its public, inbound API. */
export type ExternalMessage = Data.TaggedEnum<{
  /** Android's back button, while the page is shown; the page's own back button sends it too. */
  BackPressed: object
}>

export const ExternalMessage = Data.taggedEnum<ExternalMessage>()

/** Everything the page handles: the public messages, and the ones it generates itself. */
export type Message =
  | ExternalMessage
  | Data.TaggedEnum<{
    // From commands.
    LicensesLoaded: { licenses: ReadonlyArray<License> }
    SayingPicked: { maybeSaying: Opt.Option<string> }
  }>

export const Message = Data.taggedEnum<Message>()

/** What the page asks of its parent (the "OutMsg" pattern). */
export type Event = Data.TaggedEnum<{
  LeaveRequested: object
}>

export const Event = Data.taggedEnum<Event>()
