import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'
import type { Source } from '#libs/source/source.ts'

export class ShellError extends Data.TaggedError('ShellError')<{
  readonly cause: unknown
}> {}

export class Shell extends Context.Service<
  Shell,
  {
    /** Event: the user asks to go back (Android's back button, the browser's). */
    readonly backButton: Source<void, never>
    readonly exitApp: Effect.Effect<void, ShellError>
  }
>()('c308ed0757007dcf') {}
