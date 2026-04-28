import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'

import type { InternalMessage } from '@/app/core/messages.ts'
import * as RootModel from '@/app/core/model.ts'
import { ModelEmitter } from '@/app/ports/outbound/model-emitter.ts'
import * as Fsm from '@/shared/fsm.ts'

export const layer = Layer.effect(
  ModelEmitter,
  Effect.gen(function*() {
    const manager = yield* Fsm.Engine<RootModel.State, InternalMessage>()

    return Fsm.states(manager).pipe(
      Stream.map((state) => RootModel.makeModel(state)),
    )
  }),
)
