// Public API of the app, together with `view.ts`, `live.ts` and `in-memory.ts`.
// Everything in the subfolders (pages included) is private to the app.
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
