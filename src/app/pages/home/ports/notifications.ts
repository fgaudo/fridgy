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
>()('621d8c57b2c3c5d3') {}
