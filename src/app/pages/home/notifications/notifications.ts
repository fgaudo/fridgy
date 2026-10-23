import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'

export class NotificationError extends Data.TaggedError('NotificationError')<{
  readonly cause: unknown
}> {}

export class Notifications extends Context.Service<
  Notifications,
  {
    readonly showToast: (text: string) => Effect.Effect<void, NotificationError>
  }
>()('d8f2693bf3240ef6') {}
