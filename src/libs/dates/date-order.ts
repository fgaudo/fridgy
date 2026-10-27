import type * as Arr from 'effect/Array'
import * as _Schema from 'effect/Schema'

/** The order the day, the month and the year of a date are written in: the year last, or first. */
export const Schema = _Schema.Literals(['DMY', 'MDY', 'YMD'])

export type DateOrder = typeof Schema.Type

/** Every order, the year last first. */
export const all: Arr.NonEmptyReadonlyArray<DateOrder> = ['DMY', 'MDY', 'YMD']

/**
 * The order a locale writes a numeric date in (`it-IT`, `en-GB`: `DMY`; `en-US`: `MDY`; `ja-JP`, `hu-HU`: `YMD`),
 * the runtime's own locale's when none is given: in a browser, the device's language.
 */
export const ofLocale = (locale?: string): DateOrder => {
  const parts = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(0)
  const first = parts.find((part) => part.type !== 'literal')
  return first?.type === 'year' ? 'YMD' : first?.type === 'month' ? 'MDY' : 'DMY'
}
