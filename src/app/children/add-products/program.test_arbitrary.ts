import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { arbitrary as product } from '#domain/product.test_arbitrary.ts'
import * as Product from '#domain/product.ts'
import { datesOf, MAX_DIGITS } from '#libs/dates/digit-dates.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import type { Camera, Digit, Form, Message, State } from './program.ts'

const Msg = Data.taggedEnum<Message>()

export const digit: fc.Arbitrary<Digit> = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')

/** Digits that often name a day and a month, and sometimes nothing. */
const digits = fc.oneof(
  fc.string({ unit: digit, maxLength: MAX_DIGITS }),
  fc.tuple(fc.integer({ min: 1, max: 31 }), fc.integer({ min: 1, max: 12 })).map(([day, month]) =>
    String(day).padStart(2, '0') + String(month).padStart(2, '0')
  ),
)

/** The days the form's digits name, by the rules of a product: what can be picked. */
const offeredDates = (form: Form) =>
  Opt.match(form.maybeNow, {
    onNone: () => [],
    onSome: (now) => datesOf(form.digits, now).filter(Product.canExpireOn(now)),
  })

// The day picked is often one the digits name, and sometimes one they no longer do, or none.
export const form: fc.Arbitrary<Form> = fc.tuple(
  fc.record({
    maybeName: maybe(fc.oneof(fc.string(), fc.stringMatching(/^\d{8,13}$/))),
    replacements: fc.nat(),
    digits,
    camera: fc.constantFrom<Camera>('Checking', 'Available', 'Unavailable'),
    maybeNow: maybe(utc),
    maybeLastAdded: maybe(product),
  }),
  fc.oneof(fc.constant('offered'), fc.constant('other'), fc.constant('none')),
  fc.nat(),
  utc,
  fc.option(fc.integer({ min: -2, max: 10 })),
).map(([form, picked, index, other, maybeSinceAdded]): Form => {
  const offered = offeredDates({ ...form, maybeChosenDate: Opt.none() })
  const maybeChosenDate = picked === 'offered' && offered.length > 0
    ? Opt.fromNullishOr(offered[index % offered.length])
    : picked === 'other'
    ? Opt.some(other)
    : Opt.none()
  // The clock often ticks a few seconds after the last product was added: its snackbar shows, or has just gone.
  const maybeNow = Opt.match(form.maybeLastAdded, {
    onNone: () => form.maybeNow,
    onSome: ({ creationDate }) =>
      maybeSinceAdded === null ? form.maybeNow : Opt.some(DateTime.add(creationDate, { seconds: maybeSinceAdded })),
  })
  return { ...form, maybeChosenDate, maybeNow }
})

export const editing = form.map((form) => ({ _tag: 'Editing', form } as const))

// The scanner opens once the device can read barcodes; the answer changes then only when the camera fails.
export const scanning = fc.tuple(form, fc.constantFrom<Camera>('Available', 'Unavailable')).map((
  [form, camera],
) => ({ _tag: 'Scanning', form: { ...form, camera } } as const))

export const submitting = fc.tuple(form, product, fc.constantFrom('Form', 'Snackbar')).map((
  [form, product, from],
) => ({ _tag: 'Submitting', form, product, from } as const))

export const state: fc.Arbitrary<State> = fc.oneof(editing, scanning, submitting)

export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.constant(Msg.BackPressed()),
  fc.constant(Msg.ScanRequested()),
  fc.constant(Msg.ScanClosed()),
  fc.constant(Msg.Closed()),
  fc.constant(Msg.Repeated()),
  fc.constant(Msg.DigitErased()),
  fc.constant(Msg.CameraFailed()),
  fc.boolean().map((isAvailable) => Msg.CameraChecked({ isAvailable })),
  fc.string().map((name) => Msg.NameChanged({ name })),
  fc.constant(Msg.NameCleared()),
  digit.map((digit) => Msg.DigitTyped({ digit })),
  fc.constant(Msg.Started()),
  utc.map((date) => Msg.DateChosen({ date })),
  utc.map((now) => Msg.TimeChanged({ now })),
  fc.string().map((barcode) => Msg.Scanned({ barcode })),
  fc.boolean().map((succeeded) => Msg.Completed({ succeeded })),
)
