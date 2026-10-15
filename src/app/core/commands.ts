import * as Effect from 'effect/Effect'
import { Shell } from '../ports/shell.ts'
import { InternalMessage } from './messages.ts'

const logFailure = (action: string) => (error: { readonly cause: unknown }) =>
  Effect.logWarning(`Could not ${action}`, error.cause)

export const hideSplashScreen = Effect.gen(function*() {
  const { hideSplashScreen } = yield* Shell
  yield* hideSplashScreen.pipe(Effect.catchTag('ShellError', logFailure('hide the splash screen')))
  return InternalMessage.NoOp()
})

export const exitApp = Effect.gen(function*() {
  const { exitApp } = yield* Shell
  yield* exitApp.pipe(Effect.catchTag('ShellError', logFailure('exit the app')))
  return InternalMessage.NoOp()
})
