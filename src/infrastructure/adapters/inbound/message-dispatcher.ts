import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import type { InternalMessage } from '@/app/core/messages.ts'
import type { State } from '@/app/core/model.ts'
import * as MessageDispatcher from '@/app/ports/inbound/message-dispatcher.ts'
import * as Fsm from '@/shared/fsm.ts'

export const layer = Layer.unwrap(
  Effect.gen(function*() {
    const manager = yield* Fsm.Engine<State, InternalMessage>()
    return Layer.succeed(
      MessageDispatcher.MessageDispatcher,
      (message) => Fsm.dispatch(manager, message),
    )
  }),
)
