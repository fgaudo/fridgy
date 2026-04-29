import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { ViewportCommands } from '@/app/ports/outbound/viewport-commands.ts'

export const layer = Layer.succeed(
  ViewportCommands,
  {
    scrollToTop: Effect.sync(() => window.scrollTo({ top: 0, behavior: 'smooth' })),
  },
)
