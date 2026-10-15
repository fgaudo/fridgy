// Public API of the app, with `view.ts` and the `*.layer.ts` files: the subfolders
// (pages included) are private.
import type * as Program from '@/libs/elm/program.ts'
import type { Message } from './program/messages.ts'
import { type Model, makeModel } from './program/model.ts'
import type { State } from './program/state.ts'
import * as Subs from './program/subs.ts'
import * as Update from './program/update.ts'

export type { Message } from './program/messages.ts'
export type { Model } from './program/model.ts'
export type { State } from './program/state.ts'

export type Deps = Update.Deps

export const program: Program.Program<State, Model, Message, Deps> = {
  init: Update.init,
  update: Update.update,
  subscriptions: Subs.subscriptions,
  makeModel,
}
