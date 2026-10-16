import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'
import type { Listener } from '@/libs/listener/listener.ts'

export class ShellError extends Data.TaggedError('ShellError')<{
  readonly cause: unknown
}> {}

export class Shell extends Context.Service<
  Shell,
  {
    /** Event: Android's back button. While it is observed, the app no longer closes by itself. */
    readonly backButton: Listener<void>
    readonly exitApp: Effect.Effect<void, ShellError>
  }
>()('61fc0ccc3bc0f951') {}
