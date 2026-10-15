import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Stream from 'effect/Stream'
import type * as Engine from '@/libs/elm/engine.ts'
import { Shell } from '../ports/shell.ts'
import { Message } from './messages.ts'
import type { State } from './state.ts'
import { about, type Deps, home } from './update.ts'

const backButton = Stream.unwrap(Effect.map(Effect.service(Shell), ({ backButton }) => backButton)).pipe(
  Stream.map(() => Message.BackRequested()),
)

export const subscriptions: Engine.Emitter<State, Message, Deps> = (state) =>
  HashMap.make(['back-button', backButton]).pipe(
    HashMap.union(home.subscriptions(state)),
    HashMap.union(about.subscriptions(state)),
  )
