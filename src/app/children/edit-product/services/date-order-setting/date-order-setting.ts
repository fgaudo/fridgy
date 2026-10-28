import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'
import type { DateOrder } from '#libs/dates/date-order.ts'
import type { Source } from '#libs/source/source.ts'

/** The order could not be kept: the one in use stays. */
export class DateOrderWriteError extends Data.TaggedError('DateOrderWriteError')<{
  readonly cause: unknown
}> {}

/** The order the user types the digits of a date in, kept from one date, and one run, to the next. */
export class DateOrderSetting extends Context.Service<
  DateOrderSetting,
  {
    /**
     * Event: emits the order on subscription and after every change: the one kept last, or, until one is kept
     * or when it cannot be read, the device's locale's. It never ends.
     */
    readonly changes: Source<DateOrder, never>
    /** Keeps `order` as the user's, which `changes` then reports. Fails when the storage cannot be written. */
    readonly set: (order: DateOrder) => Effect.Effect<void, DateOrderWriteError>
  }
>()('85dfe8aeaaef5595') {}
