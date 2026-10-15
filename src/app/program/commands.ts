import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import { Shell } from '../ports/shell.ts'

export const exitApp = Effect.gen(function*() {
  const { exitApp } = yield* Shell
  yield* exitApp.pipe(Effect.catchTag('ShellError', (error) => Effect.logWarning('Could not exit the app', error.cause)))
  return Opt.none()
})
