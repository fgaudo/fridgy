import * as Data from 'effect/Data'
import * as fc from 'fast-check'
import { arbitrary as product } from '#domain/product.test_arbitrary.ts'
import { MAX_DIGITS } from '#libs/dates/digit-dates.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import type { Digit, Message, State } from './program.ts'

const Msg = Data.taggedEnum<Message>()

export const digit: fc.Arbitrary<Digit> = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')

/** Digits that often name a day and a month, and sometimes nothing. */
const digits = fc.oneof(
  fc.string({ unit: digit, maxLength: MAX_DIGITS }),
  fc.tuple(fc.integer({ min: 1, max: 31 }), fc.integer({ min: 1, max: 12 })).map(([day, month]) =>
    String(day).padStart(2, '0') + String(month).padStart(2, '0')
  ),
)

const form = fc.record({
  maybeName: maybe(fc.oneof(fc.string(), fc.stringMatching(/^\d{8,13}$/))),
  scans: fc.nat(),
  digits,
  isCameraOn: fc.boolean(),
  maybeNow: maybe(utc),
  maybeLastAdded: maybe(product),
})

export const editing = form.map((fields) => ({ _tag: 'Editing', ...fields } as const))

export const submitting = fc.tuple(form, product).map((
  [fields, product],
) => ({ _tag: 'Submitting', ...fields, product } as const))

export const state: fc.Arbitrary<State> = fc.oneof(editing, submitting)

export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.constant(Msg.BackPressed()),
  fc.constant(Msg.DigitErased()),
  fc.constant(Msg.CameraFailed()),
  fc.string().map((name) => Msg.NameChanged({ name })),
  digit.map((digit) => Msg.DigitTyped({ digit })),
  maybe(utc).map((maybeExpirationDate) => Msg.Started({ maybeExpirationDate })),
  utc.map((now) => Msg.TimeChanged({ now })),
  fc.string().map((barcode) => Msg.Scanned({ barcode })),
  fc.boolean().map((succeeded) => Msg.Completed({ succeeded })),
)
