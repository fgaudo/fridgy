import type * as Data from 'effect/Data'
import * as Opt from 'effect/Option'
import { type Offer, offered } from '@fgaudo/effect-tea'
import type { License } from '../ports/licenses.ts'
import { Message } from './messages.ts'
import type { State } from './state.ts'
import { update } from './update.ts'

export type Model = Readonly<{
  back: Offer<Message>
  licenses: Data.TaggedEnum<{
    Loading: object
    Loaded: Readonly<{ items: ReadonlyArray<License> }>
  }>
  /** Empty until a saying has been picked, or when there is none. */
  saying: string
}>

export const makeModel = (state: State): Model => ({
  back: offered(update, state)(Message.BackPressed()),
  licenses: state.licenses,
  saying: state.saying._tag === 'Picked' ? Opt.getOrElse(state.saying.maybeSaying, () => '') : '',
})
