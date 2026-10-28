import * as Data from 'effect/Data'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { arbitrary as product } from '#domain/product.test_arbitrary.ts'
import * as Product from '#domain/product.ts'
import { arbitrary as order } from '#libs/dates/date-order.test_arbitrary.ts'
import { digit, digits } from '#libs/dates/digit-date-entry.test_arbitrary.ts'
import * as DigitDateEntry from '#libs/dates/digit-date-entry.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import type { Acknowledging, Camera, DateForm, Form, Lookup, LookupOutcome, Message, State } from './program.ts'

const Msg = Data.taggedEnum<Message>()

export { digit }

/** A barcode as the scanner reads it: EAN-8, UPC-A or EAN-13. */
export const barcode = fc.stringMatching(/^\d{8}$|^\d{12,13}$/)

/** A lookup's answer; most often none. */
const lookup: fc.Arbitrary<Lookup> = fc.oneof(
  { arbitrary: fc.constant<Lookup>({ _tag: 'Idle' }), weight: 3 },
  fc.webUrl().map((url): Lookup => ({ _tag: 'Found', url })),
  fc.constant<Lookup>({ _tag: 'NotFound' }),
  fc.constant<Lookup>({ _tag: 'Failed' }),
)

const outcome: fc.Arbitrary<LookupOutcome> = fc.oneof(
  fc.tuple(fc.string({ minLength: 1 }), fc.webUrl()).map(([name, url]): LookupOutcome => ({
    _tag: 'Found',
    name,
    url,
  })),
  fc.constant<LookupOutcome>({ _tag: 'NotFound' }),
  fc.constant<LookupOutcome>({ _tag: 'Failed' }),
)

const acknowledging: fc.Arbitrary<Acknowledging> = fc.record({
  product,
  by: fc.constantFrom<Acknowledging['by']>('NameButton', 'DateButton'),
})

/** The days the digits name, by the rules of a product: what can be picked. */
const offeredDates = (form: Form, digits: string) =>
  Opt.match(Opt.all([form.maybeNow, form.maybeOrder]), {
    onNone: () => [],
    onSome: ([now, order]) =>
      DigitDateEntry.offered({ ...DigitDateEntry.empty, digits }, now, order, Product.canExpireOn(now)),
  })

export const form: fc.Arbitrary<Form> = fc.tuple(
  fc.record({
    maybeName: maybe(fc.oneof(fc.string(), fc.stringMatching(/^\d{8,13}$/))),
    replacements: fc.nat(),
    camera: fc.constantFrom<Camera>('Checking', 'Available', 'Unavailable'),
    lookup,
    maybeNow: maybe(utc),
    maybeOrder: maybe(order),
    maybeAcknowledging: maybe(acknowledging),
  }),
  fc.boolean(),
  barcode,
).map(([form, keepsName, scanned]): Form => {
  // The name is often the product's just added, as the page keeps it after adding one; when the lookup did not
  // name the product, it is the barcode scanned.
  const maybeName = form.lookup._tag === 'NotFound' || form.lookup._tag === 'Failed'
    ? Opt.some(scanned)
    : keepsName
    ? Opt.orElse(Opt.map(form.maybeAcknowledging, ({ product: { name } }) => name), () => form.maybeName)
    : form.maybeName
  return { ...form, maybeName }
})

// The day picked is often one the digits name, and sometimes one they no longer do, or none.
const formAndDate: fc.Arbitrary<[Form, DateForm]> = fc.tuple(
  form,
  digits,
  fc.constantFrom('offered', 'other', 'none'),
  fc.nat(),
  utc,
).map(([form, digits, picked, index, other]) => {
  const offered = offeredDates(form, digits)
  const maybeChosenDate = picked === 'offered' && offered.length > 0
    ? Opt.fromNullishOr(offered[index % offered.length])
    : picked === 'other'
    ? Opt.some(other)
    : Opt.none()
  return [form, { digits, maybeChosenDate }]
})

export const naming = form.map((form) => ({ _tag: 'Naming', form } as const))

// The barcode looked up is the name, and no answer has come yet.
export const lookingUp = fc.tuple(form, barcode).map(([form, barcode]) => ({
  _tag: 'LookingUp',
  form: { ...form, maybeName: Opt.some(barcode), lookup: { _tag: 'Idle' } },
  barcode,
} as const))

// The scanner opens once the device can read barcodes; the answer changes then only when the camera fails.
export const scanning = fc.tuple(form, fc.constantFrom<Camera>('Available', 'Unavailable')).map((
  [form, camera],
) => ({ _tag: 'Scanning', form: { ...form, camera } } as const))

export const dating = formAndDate.map(([form, date]) => ({ _tag: 'Dating', form, date } as const))

export const submitting = fc.tuple(formAndDate, product, fc.boolean()).map((
  [[form, date], product, isDating],
) => ({
  _tag: 'Submitting',
  form,
  product,
  step: isDating ? { _tag: 'Dating', date } as const : { _tag: 'Naming' } as const,
} as const))

export const state: fc.Arbitrary<State> = fc.oneof(naming, lookingUp, scanning, dating, submitting)

export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.constant(Msg.BackPressed()),
  fc.constant(Msg.ScanRequested()),
  fc.constant(Msg.ScanClosed()),
  fc.constant(Msg.DateRequested()),
  fc.constant(Msg.DateDismissed()),
  fc.constant(Msg.Closed()),
  fc.constant(Msg.LookupCancelled()),
  fc.constant(Msg.DigitErased()),
  fc.constant(Msg.DateCleared()),
  fc.constant(Msg.CameraFailed()),
  fc.boolean().map((isAvailable) => Msg.CameraChecked({ isAvailable })),
  fc.string().map((name) => Msg.NameChanged({ name })),
  fc.constant(Msg.NameCleared()),
  digit.map((digit) => Msg.DigitTyped({ digit })),
  fc.constant(Msg.Started()),
  utc.map((date) => Msg.DateChosen({ date })),
  order.map((order) => Msg.OrderPicked({ order })),
  utc.map((now) => Msg.TimeChanged({ now })),
  order.map((order) => Msg.OrderChanged({ order })),
  fc.boolean().map((succeeded) => Msg.OrderKept({ succeeded })),
  fc.string().map((barcode) => Msg.Scanned({ barcode })),
  fc.tuple(barcode, outcome).map(([barcode, outcome]) => Msg.LookedUp({ barcode, outcome })),
  fc.boolean().map((succeeded) => Msg.Completed({ succeeded })),
  utc.map((at) => Msg.AddedShown({ at })),
)
