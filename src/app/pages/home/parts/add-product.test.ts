import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as Product from '#app/domain/product.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import { type Command, type Event, type Message, program } from './add-product.ts'
import { closed, editing, message, state, submitting } from './add-product.test_arbitrary.ts'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()
const Ev = Data.taggedEnum<Event>()

const { outcome, rejects, step } = outcomesOf(program.update)

describe('AddProduct update', () => {
  test('is total and deterministic', () => {
    assertProperty([state, message], (before, msg) => Equal.equals(outcome(msg, before), outcome(msg, before)))
  })

  test('Opened opens an empty form, or is rejected when it is already open', () => {
    assertProperty([state], (before) =>
      before._tag !== 'Closed'
        ? rejects(Msg.Opened(), before)
        : Equal.equals(step(Msg.Opened(), before).after, {
          _tag: 'Editing',
          maybeName: Opt.none(),
          maybeExpirationDate: Opt.none(),
          maybeNow: Opt.none(),
        }))
  })

  test('Closed closes an edited form, or is rejected when closed or submitting', () => {
    assertProperty([state], (before) =>
      before._tag !== 'Editing'
        ? rejects(Msg.Closed(), before)
        : step(Msg.Closed(), before).after._tag === 'Closed')
  })

  describe('NameChanged and ExpirationDateChanged', () => {
    // While submitting the inputs are disabled, but a key typed just before must not be lost.
    test('store what is typed, as typed, wherever the form is open', () => {
      assertProperty([fc.oneof(editing, submitting), fc.string(), fc.integer()], (before, name, expiration) => {
        const named = step(Msg.NameChanged({ name }), before).after
        const dated = step(Msg.ExpirationDateChanged({ expiration }), before).after
        return Equal.equals(named, { ...before, maybeName: Opt.some(name) })
          && Equal.equals(dated, { ...before, maybeExpirationDate: DateTime.make(expiration) })
      })
    })

    test('are rejected when the form is closed', () => {
      assertProperty(
        [closed, fc.string()],
        (before, text) =>
          rejects(Msg.NameChanged({ name: text }), before)
          && rejects(Msg.ExpirationDateChanged({ expiration: text }), before),
      )
    })
  })

  test('TimeChanged keeps the time while the form is open, and is rejected when it is closed', () => {
    assertProperty([state, utc], (before, now) =>
      before._tag === 'Closed'
        ? rejects(Msg.TimeChanged({ now }), before)
        : Equal.equals(step(Msg.TimeChanged({ now }), before).after, { ...before, maybeNow: Opt.some(now) }))
  })

  // The product is created at the time the form last heard: the rules of a product decide.
  test('Started submits the product the form describes, or is rejected when it describes none', () => {
    assertProperty([state], (before) => {
      const maybeProduct = before._tag === 'Editing'
        ? Opt.flatMap(
          Opt.all([before.maybeName, before.maybeNow]),
          ([name, creationDate]) =>
            Product.make({ name, creationDate, maybeExpirationDate: before.maybeExpirationDate }),
        )
        : Opt.none()
      if (Opt.isNone(maybeProduct)) {
        return rejects(Msg.Started(), before)
      }
      const { after, commands } = step(Msg.Started(), before)
      return Equal.equals(after, { ...before, _tag: 'Submitting' })
        && Equal.equals(commands, [Cmd.Add({ product: maybeProduct.value })])
    })
  })

  // Guards against the property above passing only on rejections.
  test('the arbitrary forms describe products, and break each rule of a product', () => {
    const offered = fc.sample(editing, 500).map((form) => Tea.modelOf(program)(form)._tag)
    expect(offered).toContain('Complete')
    expect(offered).toContain('Incomplete')
  })

  test('the model says when the product would expire before the day it is added', () => {
    assertProperty([editing, utc], (form, now) => {
      const model = Tea.modelOf(program)({ ...form, maybeNow: Opt.some(now) })
      const isPast = Opt.exists(form.maybeExpirationDate, (expiration) => !Product.canExpireOn(now)(expiration))
      return isPast ? model._tag === 'Incomplete' && model.isExpirationPast : model._tag !== 'Submitting'
    })
  })

  describe('Completed', () => {
    test('success closes the form', () => {
      assertProperty([submitting], (before) => {
        const { after, events } = step(Msg.Completed({ succeeded: true }), before)
        return after._tag === 'Closed' && events.length === 0
      })
    })

    test('failure gives the form back, as it was, and says so', () => {
      assertProperty([submitting], (before) => {
        const { after, events } = step(Msg.Completed({ succeeded: false }), before)
        return Equal.equals(after, { ...before, _tag: 'Editing' }) && Equal.equals(events, [Ev.Failed()])
      })
    })

    test('is rejected when no submission is in progress', () => {
      assertProperty(
        [fc.oneof(closed, editing), fc.boolean()],
        (before, succeeded) => rejects(Msg.Completed({ succeeded }), before),
      )
    })
  })

  test('BackPressed closes an edited form, keeps one being submitted, and has nothing to close otherwise', () => {
    assertProperty([state], (before) => {
      const { after, commands, events } = step(Msg.BackPressed(), before)
      const expected = {
        Editing: () => after._tag === 'Closed' && events.length === 0,
        Submitting: () => Equal.equals(after, before) && events.length === 0,
        Closed: () => Equal.equals(after, before) && Equal.equals(events, [Ev.NothingToClose()]),
      }[before._tag]()
      return expected && commands.length === 0
    })
  })
})
