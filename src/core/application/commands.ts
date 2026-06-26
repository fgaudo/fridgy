import * as Effect from 'effect/Effect'
import { InternalMessage } from '@/core/application/messages.ts'
import { Viewport } from '@/core/application/outbound/viewport.ts'

export const hideSplashScreen = Effect.gen(function*() {
  const { hideSplashScreen } = yield* Viewport
  yield* hideSplashScreen
  return InternalMessage.NoOp()
})

export const closeApp = Effect.gen(function*() {
  const { closeApp } = yield* Viewport
  yield* closeApp
  return InternalMessage.NoOp()
})
