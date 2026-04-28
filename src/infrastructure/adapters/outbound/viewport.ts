import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { Viewport } from '@/app/ports/outbound/viewport.ts'

export const layer = Layer.succeed(
  Viewport,
  {
    scrollTo: (opt) => Effect.sync(() => window.scrollTo(opt)),
  },
)
