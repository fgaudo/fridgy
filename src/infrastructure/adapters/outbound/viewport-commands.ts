import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { ViewportCommands } from '@/app/ports/outbound/viewport-commands.ts'

export const layer = Layer.succeed(
  ViewportCommands,
  {
    scrollTo: (opt) => Effect.sync(() => window.scrollTo(opt)),
    isWindowAtTop: Effect.sync(() => window.scrollY === 0),
  },
)
