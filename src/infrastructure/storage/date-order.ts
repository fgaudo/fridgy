// The order the user types a date's digits in, for every adapter that reads or keeps it: a setting, the order's
// text under its name, and the device's locale's order until one is kept.
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as DateOrder from '#libs/dates/date-order.ts'
import { SettingStore } from './settings.ts'

/** The setting's name in the storage. */
export const KEY = 'date-order'

const decode = Schema.decodeUnknownOption(DateOrder.Schema)

export class DateOrderStore extends Context.Service<DateOrderStore>()(
  '7a01185863b0a606',
  {
    make: Effect.gen(function*() {
      const { read, write, tables } = yield* SettingStore
      // The device's locale's order, until the user picks one: the one they read dates in.
      const ofLocale = Effect.sync(() => DateOrder.ofLocale())
      /** The order kept, or the locale's: when nothing is kept, when it cannot be read, or when it is not an order. */
      const current = Effect.gen(function*() {
        const maybeStored = yield* read(KEY).pipe(
          Effect.tapError((error) => Effect.logWarning('Could not read the date order', error)),
          Effect.orElseSucceed((): Opt.Option<string> => Opt.none()),
        )
        if (Opt.isNone(maybeStored)) return yield* ofLocale
        const maybeOrder = decode(maybeStored.value)
        if (Opt.isNone(maybeOrder)) {
          yield* Effect.logWarning('The stored date order is not one', maybeStored.value)
          return yield* ofLocale
        }
        return maybeOrder.value
      })
      /** Keeps `order` as the user's. */
      const set = (order: DateOrder.DateOrder) => write(KEY, order)
      // The tables the order is in, for a query that reacts to their changes.
      return { current, set, tables }
    }),
  },
) {
  static layer = Layer.effect(this, this.make).pipe(Layer.provide(SettingStore.layer))
}
