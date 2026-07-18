import * as Effect from 'effect/Effect'
import { InternalMessage } from '@/core/application/messages.ts'
import { UiCommands } from '@/core/application/outbound/ui-commands'

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
