import * as Match from 'effect/Match'
import type * as Engine from '@/libs/elm/engine.ts'
import type { Licenses } from '../ports/licenses.ts'
import type { Sayings } from '../ports/sayings.ts'
import * as Cmd from './commands.ts'
import { Event, type Message } from './messages.ts'
import type { State } from './state.ts'

export type Deps = Licenses | Sayings

export const update = Match.typeTags<
  Message,
  (state: State) => Engine.Transition<State, Message, Deps, Event>
>()({
  LicensesLoaded: ({ licenses }) => (state) => ({
    state: { ...state, licenses: { _tag: 'Loaded', items: licenses } },
  }),

  SayingPicked: ({ maybeSaying }) => (state) => ({
    state: { ...state, saying: { _tag: 'Picked', maybeSaying } },
  }),

  BackPressed: () => (state) => ({ state, events: [Event.LeaveRequested()] }),
})

export const init: Engine.Step<State, Message, Deps> = {
  state: { licenses: { _tag: 'Loading' }, saying: { _tag: 'Loading' } },
  commands: [Cmd.loadLicenses, Cmd.pickSaying],
}
