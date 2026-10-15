import type * as Engine from '@/libs/elm/engine.ts'
import type * as Home from '../pages/home/program.ts'
import type { InternalMessage } from './messages.ts'
import type { State } from './state.ts'
import { home } from './update.ts'

export type Deps = Home.Deps

// Merge more pages with HashMap.union as they are added.
export const subscriptions: Engine.Emitter<State, InternalMessage, Deps> = (state) => home.subscriptions(state)
