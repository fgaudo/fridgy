import * as Effect from 'effect/Effect'
import { InternalMessage } from '@/app/core/messages.ts'

export const hideSplashScreen = Effect.gen(function*() {
  const { hideSplashScreen } = yield* UiCommands
  yield* hideSplashScreen
  return InternalMessage.NoOp()
})

export const closeApp = Effect.gen(function*() {
  const { closeApp } = yield* UiCommands
  yield* closeApp
  return InternalMessage.NoOp()
})
