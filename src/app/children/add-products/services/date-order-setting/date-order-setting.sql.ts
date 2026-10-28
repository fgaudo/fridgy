import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as SqlClient from 'effect/sql/SqlClient'
import { DateOrderStore } from '#infrastructure/storage/date-order.ts'
import type * as DateOrder from '#libs/dates/date-order.ts'
import * as Source from '#libs/source/source.ts'
import { DateOrderSetting, DateOrderWriteError } from './date-order-setting.ts'

export const layer = Layer.effect(
  DateOrderSetting,
  Effect.gen(function*() {
    const { current, set: keep, tables } = yield* DateOrderStore
    const sql = yield* SqlClient.SqlClient
    const changes = Source.fromStream(
      sql.reactive(tables, current).pipe(Stream.buffer({ capacity: 1, strategy: 'sliding' })),
    )
    const set = (order: DateOrder.DateOrder) =>
      keep(order).pipe(Effect.mapError((cause) => new DateOrderWriteError({ cause })))
    return { changes, set }
  }),
).pipe(Layer.provide(DateOrderStore.layer))
