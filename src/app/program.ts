import type * as Tea from '@fgaudo/effect-tea'
import type { Message } from './program/messages.ts'
import type { Deps } from './program/navigation.ts'
import { makeModel, type Model } from './program/model.ts'
import type { State } from './program/state.ts'
import * as Subs from './program/subs.ts'
import * as Update from './program/update.ts'

export type { Message } from './program/messages.ts'
export { describeMessage } from './program/messages.ts'
export type { Model } from './program/model.ts'

export type { Deps }

export const program: Tea.Program<State, Model, Message, Deps> = {
  init: Update.init,
  update: Update.update,
  subscriptions: Subs.subscriptions,
  makeModel,
}
