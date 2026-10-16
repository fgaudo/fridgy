import * as Channel from 'effect/Channel'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import type * as Tea from '@fgaudo/effect-tea'
import { Shell } from '../ports/shell.ts'
import { Message } from './messages.ts'
import type { State } from './state.ts'
import { about, type Deps, home } from './navigation.ts'

const backButton: Tea.Subscription<Message, Shell> = Channel.unwrap(
  Effect.map(Effect.service(Shell), ({ backButton }) => Channel.map(backButton, () => Message.BackRequested())),
)

export const subscriptions: Tea.Emitter<State, Message, Deps> = (state) =>
  HashMap.make(['back-button', backButton]).pipe(
    HashMap.union(home.subscriptions(state)),
    HashMap.union(about.subscriptions(state)),
  )
