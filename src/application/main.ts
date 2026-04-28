import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import { flow } from 'effect/Function'

import { ModelEmitter } from '@/app/ports/outbound/model-emitter.ts'
import { Renderer } from '@/app/ports/outbound/model-renderer.ts'

export const Main = Effect.gen(function*() {
  const render = yield* Renderer
  const model$ = yield* ModelEmitter
  return yield* render(model$).pipe(
    Effect.tapCause(flow(Cause.squash, Effect.logFatal)),
  )
})
