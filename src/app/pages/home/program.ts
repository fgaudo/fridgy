// Public API of the Home page, together with `view.ts`, `sqlite.layer.ts`
// and `in-memory.layer.ts`. Everything in the subfolders is private to the page.
import type * as Program from '@/libs/elm/program.ts'
import type { InternalMessage } from './program/messages.ts'
import { type Model, makeModel } from './program/model.ts'
import type { State } from './program/state.ts'
import * as Subs from './program/subs.ts'
import * as Update from './program/update.ts'

export type { InternalMessage, Message } from './program/messages.ts'
export type { Model } from './program/model.ts'
export type { State } from './program/state.ts'

export type Deps = Update.Deps | Subs.Deps

export const program: Program.Program<State, Model, InternalMessage, Deps> = {
  init: Update.init,
  update: Update.update,
  subscriptions: Subs.subscriptions,
  makeModel,
}
