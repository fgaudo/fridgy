import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'

export class NotificationError extends Data.TaggedError('NotificationError')<{
  readonly cause: unknown
}> {}

/** The platform's toasts, which the programs use directly: a toast is a text, for every one of them alike. */
export class Notifications extends Context.Service<
  Notifications,
  {
    readonly showToast: (text: string) => Effect.Effect<void, NotificationError>
  }
>()('d6ec937bffb89a04') {}
