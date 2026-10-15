import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'
import type * as Stream from 'effect/Stream'

export class ShellError extends Data.TaggedError('ShellError')<{
  readonly cause: unknown
}> {}

/** The native shell hosting the app. */
export class Shell extends Context.Service<
  Shell,
  {
    /** Event: Android's back button. While it is observed, the app no longer closes by itself. */
    readonly backButton: Stream.Stream<void>
    readonly exitApp: Effect.Effect<void, ShellError>
  }
>()('61fc0ccc3bc0f951') {}
