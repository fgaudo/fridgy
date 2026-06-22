import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class Viewport extends Context.Service<
  Viewport,
  {
    hideSplashScreen: Effect.Effect<void>
    showToast: (message: string) => Effect.Effect<void>
    closeApp: Effect.Effect<void>
  }
>()('5febefa297b80e1f') {}
