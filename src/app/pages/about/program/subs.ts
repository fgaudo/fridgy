import * as HashMap from 'effect/HashMap'
import type * as Engine from '@/libs/elm/engine.ts'
import type { Message } from './messages.ts'
import type { State } from './state.ts'

export type Deps = never

export const subscriptions: Engine.Emitter<State, Message, Deps> = () => HashMap.empty()
