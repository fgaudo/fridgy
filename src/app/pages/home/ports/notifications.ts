import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'

export class NotificationError extends Data.TaggedError('NotificationError')<{
  readonly cause: unknown
}> {}

/** Short, transient messages for the user. */
export class Notifications extends Context.Service<
  Notifications,
  {
    /** Command: shows a toast with the given text. */
    readonly showToast: (text: string) => Effect.Effect<void, NotificationError>
  }
>()('621d8c57b2c3c5d3') {}
