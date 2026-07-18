import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { UiCommands } from '@/feature/home/application/outbound/ui-commands.ts'

export const uiCommandsLive = Layer.succeed(
  UiCommands,
  {
    scrollToTop: Effect.sync(
      () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    ),
  },
)
