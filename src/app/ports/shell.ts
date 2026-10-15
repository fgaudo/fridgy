import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'

export class ShellError extends Data.TaggedError('ShellError')<{
  readonly cause: unknown
}> {}

export class Shell extends Context.Service<
  Shell,
  {
    readonly hideSplashScreen: Effect.Effect<void, ShellError>
    readonly exitApp: Effect.Effect<void, ShellError>
  }
>()('61fc0ccc3bc0f951') {}
