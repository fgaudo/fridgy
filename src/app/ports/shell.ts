import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'

export class ShellError extends Data.TaggedError('ShellError')<{
  readonly cause: unknown
}> {}

/** The native shell hosting the app: splash screen and app lifecycle. */
export class Shell extends Context.Service<
  Shell,
  {
    /** Command: hides the splash screen shown while the app boots. */
    readonly hideSplashScreen: Effect.Effect<void, ShellError>
    /** Command: closes the app. */
    readonly exitApp: Effect.Effect<void, ShellError>
  }
>()('61fc0ccc3bc0f951') {}
