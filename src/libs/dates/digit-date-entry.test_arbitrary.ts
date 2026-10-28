import * as fc from 'fast-check'
import type { Digit } from './digit-date-entry.ts'
import { MAX_DIGITS } from './digit-dates.ts'

export const digit: fc.Arbitrary<Digit> = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')

/** Digits as a keypad types them, that often name a day and a month, and sometimes nothing. */
export const digits: fc.Arbitrary<string> = fc.oneof(
  fc.string({ unit: digit, maxLength: MAX_DIGITS }),
  fc.tuple(fc.integer({ min: 1, max: 31 }), fc.integer({ min: 1, max: 12 })).map(([day, month]) =>
    String(day).padStart(2, '0') + String(month).padStart(2, '0')
  ),
)
