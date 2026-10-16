import * as HashMap from 'effect/HashMap'
import type * as Tea from '@fgaudo/effect-tea'
import type { Message } from './messages.ts'
import type { State } from './state.ts'

export type Deps = never

export const subscriptions: Tea.Emitter<State, Message, Deps> = () => HashMap.empty()
