import { describe, test } from 'bun:test'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as NormalizedString from '#libs/strings/normalized-string.ts'
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

  test('Started submits a form whose name normalizes to a valid one, or is rejected', () => {
    assertProperty([state], (before) => {
      const canStart = before._tag === 'Editing'
        && Opt.exists(before.maybeName, (name) => Opt.isSome(NormalizedString.fromString(name)))
      if (!canStart) {
        return rejects(Msg.Started(), before)
      }
      const { maybeName, maybeExpirationDate } = before
      const { after, commands } = step(Msg.Started(), before)
      return Equal.equals(after, { _tag: 'Submitting', maybeName, maybeExpirationDate })
        && Equal.equals(commands, [Cmd.Add({ maybeName, maybeExpirationDate })])
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
        const { maybeName, maybeExpirationDate } = before
        const { after, events } = step(Msg.Completed({ succeeded: false }), before)
        return Equal.equals(after, { _tag: 'Editing', maybeName, maybeExpirationDate })
          && Equal.equals(events, [Ev.Failed()])
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
