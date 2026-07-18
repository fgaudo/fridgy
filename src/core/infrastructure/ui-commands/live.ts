import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { UiCommands } from '@/core/application/outbound/ui-commands.ts'

export const layer = Layer.succeed(
  UiCommands,
  {
    closeApp: Effect.void,
    hideSplashScreen: Effect.void,
  },
)
