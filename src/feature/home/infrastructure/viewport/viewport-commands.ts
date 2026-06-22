import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { Viewport } from '@/feature/home/application/outbound/viewport.ts'

export const layer = Layer.succeed(
  Viewport,
  {
    scrollToTop: Effect.sync(() => window.scrollTo({ top: 0, behavior: 'smooth' })),
  },
)
