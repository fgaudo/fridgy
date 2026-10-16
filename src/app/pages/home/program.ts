import type * as Tea from '@fgaudo/effect-tea'
import type { Event, Message } from './program/messages.ts'
import { makeModel, type Model } from './program/model.ts'
import type { State } from './program/state.ts'
import * as Subs from './program/subs.ts'
import * as Update from './program/update.ts'

export { Event, ExternalMessage } from './program/messages.ts'
export type { Message } from './program/messages.ts'
export type { Model } from './program/model.ts'
export type { State } from './program/state.ts'

export type Deps = Update.Deps | Subs.Deps

export const program: Tea.Program<State, Model, Message, Deps, Event> = {
  init: Update.init,
  update: Update.update,
  subscriptions: Subs.subscriptions,
  makeModel,
}
