import * as Data from 'effect/Data'
import * as fc from 'fast-check'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import type { Message, State } from './add-product.ts'

const Msg = Data.taggedEnum<Message>()

const form = fc.record({ maybeName: maybe(fc.string()), maybeExpirationDate: maybe(utc), maybeNow: maybe(utc) })

export const closed = fc.constant({ _tag: 'Closed' } as const)

export const editing = form.map((fields) => ({ _tag: 'Editing', ...fields } as const))

export const submitting = form.map((fields) => ({ _tag: 'Submitting', ...fields } as const))

export const state: fc.Arbitrary<State> = fc.oneof(closed, editing, submitting)

export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.constant(Msg.Opened()),
  fc.constant(Msg.Closed()),
  fc.constant(Msg.Started()),
  fc.constant(Msg.BackPressed()),
  fc.string().map((name) => Msg.NameChanged({ name })),
  fc.oneof(fc.string(), fc.integer()).map((expiration) => Msg.ExpirationDateChanged({ expiration })),
  utc.map((now) => Msg.TimeChanged({ now })),
  fc.boolean().map((succeeded) => Msg.Completed({ succeeded })),
)
