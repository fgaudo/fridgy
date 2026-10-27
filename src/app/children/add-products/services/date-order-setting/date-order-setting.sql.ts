import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'
import * as SqlClient from 'effect/sql/SqlClient'
import { SettingStore } from '#infrastructure/storage/settings.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import * as Source from '#libs/source/source.ts'
import { DateOrderSetting, DateOrderWriteError } from './date-order-setting.ts'

/** The setting's name in the storage. */
export const KEY = 'date-order'

const decode = Schema.decodeUnknownOption(DateOrder.Schema)

export const layer = Layer.effect(
  DateOrderSetting,
  Effect.gen(function*() {
    const { read, write, tables } = yield* SettingStore
    const sql = yield* SqlClient.SqlClient
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
    const changes = Source.fromStream(
      sql.reactive(tables, current).pipe(Stream.buffer({ capacity: 1, strategy: 'sliding' })),
    )
    const set = (order: DateOrder.DateOrder) =>
      write(KEY, order).pipe(Effect.mapError((cause) => new DateOrderWriteError({ cause })))
    return { changes, set }
  }),
).pipe(Layer.provide(SettingStore.layer))
