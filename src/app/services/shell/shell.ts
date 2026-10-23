import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type { Source } from '#libs/source/source.ts'

export class ShellError extends Data.TaggedError('ShellError')<{
  readonly cause: unknown
}> {}

export class Shell extends Context.Service<
  Shell,
  {
    /**
     * Event: the user asks to go back (Android's back button, the browser's). The button is the app's only while
     * it is observed: otherwise the platform acts on it, leaving the app.
     */
    readonly backButton: Source<void, never>
  }
>()('c308ed0757007dcf') {}
