// Public API of the Home page, together with `view.ts`, `sqlite.ts` and
// `in-memory.ts`. Everything in the subfolders is private to the page.
import type * as Program from '@/libs/elm/program.ts'
import type { InternalMessage } from './core/messages.ts'
import { type Model, makeModel } from './core/model.ts'
import type { State } from './core/state.ts'
import * as Subs from './core/subs.ts'
import * as Update from './core/update.ts'

export type { InternalMessage, Message } from './core/messages.ts'
export type { Model } from './core/model.ts'
export type { State } from './core/state.ts'

export type Deps = Update.Deps | Subs.Deps

export const program: Program.Program<State, Model, InternalMessage, Deps> = {
  init: Update.init,
  update: Update.update,
  subscriptions: Subs.subscriptions,
  makeModel,
}
