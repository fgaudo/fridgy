import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'
import type { Source } from '@/libs/source/source.ts'

export class ShellError extends Data.TaggedError('ShellError')<{
  readonly cause: unknown
}> {}

export class Shell extends Context.Service<
  Shell,
  {
    /** Event: Android's back button. While it is observed, the app no longer closes by itself. */
    readonly backButton: Source<void, never>
    readonly exitApp: Effect.Effect<void, ShellError>
  }
>()('61fc0ccc3bc0f951') {}
