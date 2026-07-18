import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class UiCommands extends Context.Service<
  UiCommands,
  {
    hideSplashScreen: Effect.Effect<void>
    closeApp: Effect.Effect<void>
  }
>()('1e80ec5d9c885e0f') {}
