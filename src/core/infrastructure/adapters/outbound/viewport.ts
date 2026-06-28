import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { Viewport } from '@/core/application/outbound/viewport.ts'

export const layer = Layer.succeed(
  Viewport,
  { closeApp: Effect.void, hideSplashScreen: Effect.void },
)
