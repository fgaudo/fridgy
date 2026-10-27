// The stored settings, reached without a service: the adapters' tests use them to set up and check their
// service's contract, so that no service carries reads or writes that only tests need.
import * as Effect from 'effect/Effect'
import { SettingStore } from './settings.ts'

/** The text stored under `key`, as the database holds it. */
export const readSetting = (key: string) => SettingStore.use(({ read }) => read(key)).pipe(Effect.orDie)

/** Stores `value` under `key`, in place of what was there. */
export const writeSetting = (key: string, value: string) =>
  SettingStore.use(({ write }) => write(key, value)).pipe(Effect.orDie)
