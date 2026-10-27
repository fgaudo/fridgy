import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import { readSetting, writeSetting } from '#infrastructure/storage/settings.test_support.ts'
import { SettingStore } from '#infrastructure/storage/settings.ts'
import * as SqliteMemory from '#infrastructure/storage/sqlite.memory.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import * as DateOrderSettingSql from './date-order-setting.sql.ts'
import { dateOrderSettingContract } from './date-order-setting.test_contract.ts'

const decode = Schema.decodeUnknownOption(DateOrder.Schema)

dateOrderSettingContract(
  'sqlite',
  () =>
    DateOrderSettingSql.layer.pipe(
      Layer.provideMerge(SettingStore.layer),
      Layer.provideMerge(SqliteMemory.layer),
    ),
  {
    stored: Effect.map(readSetting(DateOrderSettingSql.KEY), Opt.flatMap(decode)),
    store: (order) => writeSetting(DateOrderSettingSql.KEY, order),
  },
)
