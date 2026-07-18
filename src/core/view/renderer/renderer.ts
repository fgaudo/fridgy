import * as Config from 'effect/Config'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import type { InternalMessage } from '@/core/application/messages.ts'
import type { Model, State } from '@/core/application/model.ts'
import type * as Root from '@/core/view/view.ts'
import type { Engine } from '@/libs/fsm.ts'

export class Renderer extends Context.Service<
  Renderer,
  {
    render: (
      model$: Stream.Stream<Model>,
    ) => Effect.Effect<
      void,
      never,
      Effect.Services<typeof Root['makeView']>
    >
  }
>()('49e7cdadb115c143') {}
