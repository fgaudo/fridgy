import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { applyAll, dispatchViolations, stateOf } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as fc from 'fast-check'
import * as Expiration from '#app/programs/expiration/program.ts'
import type * as SnackbarProgram from '#app/programs/snackbar/program.ts'
import { nthId } from '#domain/product.test_arbitrary.ts'
import * as Product from '#domain/product.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import { arbitrary as anyDay } from '#libs/dates/day.test_arbitrary.ts'
import * as Day from '#libs/dates/day.ts'
import type { Digit } from '#libs/dates/digit-date-entry.ts'
import { messagesSentBy } from '#libs/tea-react/view.test_support.ts'
import { zoned } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import {
  editing,
  gone,
  keyboardInset,
  loading,
  message,
  outcome,
  saving,
  state,
  type Whole,
} from './program.test_arbitrary.ts'
import { type Command, type Event, type Failure, type Fields, type Message, type Model, program } from './program.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()
const Ev = Data.taggedEnum<Event>()
const DateMsg = Data.taggedEnum<Expiration.Message>()

const { outcome: outcomeOf, rejects, step } = outcomesOf(program.update)

const { makeModel } = program

const digits: ReadonlyArray<Digit> = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/** A message of the date, as the page receives it. */
const toDate = (message: Expiration.Message): Message => ({ _tag: 'Expiration', message })

/** A message of the snackbar, as the page receives it. */
const toSnackbar = (message: SnackbarProgram.Message): Message => ({ _tag: 'Snackbar', message })

/** The fields, in every state but `Loading`. */
const fieldsOf = (s: Whole): Opt.Option<Fields> =>
  s.own.form._tag === 'Loading' ? Opt.none() : Opt.some(s.own.form.fields)

const dateOf = (s: Whole) => Opt.getOrThrow(s.children.Expiration).state

const snackbarOf = (s: Whole) => Opt.getOrThrow(s.children.Snackbar).state

/** What the date concludes, as the page reads it. */
const concluded = (s: Whole) => Expiration.program.output(dateOf(s))

/**
 * The product "Save" writes: the one made from the name and what the date concludes, when it differs from the
 * stored one by its name or its day.
 */
const savedProduct = (s: Whole, fields: Fields): Opt.Option<Product.Product> => {
  const output = concluded(s)
  return output._tag === 'Undecided' ? Opt.none() : Opt.filter(
    Product.edit(
      s.own.original,
      { name: fields.name, maybeExpirationDate: output._tag === 'On' ? Opt.some(output.day) : Opt.none() },
      fields.now.zone,
    ),
    (product) =>
      product.name !== s.own.original.name
      || !Equal.equals(product.maybeExpirationDate, s.own.original.maybeExpirationDate),
  )
}

/** What the page tells its date in a state: the time, and that the form is locked unless it is edited. */
const toldOf = (s: Whole) => ({
  maybeNow: Opt.map(fieldsOf(s), ({ now }) => now),
  isLocked: s.own.form._tag !== 'Editing',
})

/** The whole state with the page's own state changed, its children as they were. */
const withOwn = (s: Whole, own: Whole['own']): Whole => ({ ...s, own })

/** A completion while nothing is being saved. */
const cannotArrive = (msg: Message, before: Whole) => msg._tag === 'Saved' && before.own.form._tag !== 'Saving'

const withFields = fc.oneof(editing, saving, gone)

const shown = withFields.filter((s) => makeModel(s)._tag !== 'Loading')

describe('EditProduct update', () => {
  test('is total and deterministic, but for a message that cannot arrive', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(!cannotArrive(msg, before))
      return Equal.equals(outcomeOf(msg, before), outcomeOf(msg, before))
    })
  })

  // The root keeps each visit of the page as an instance: an answer for a visit that is over reaches no later one.
  test('a completion while nothing is being saved is a defect', () => {
    assertProperty([state, outcome], (before, outcome) => {
      fc.pre(before.own.form._tag !== 'Saving')
      expect(() => program.update(Msg.Saved({ outcome }))(before)).toThrow(Tea.InvariantDefect)
      return true
    })
  })

  // The digit keys and the backspace are meant to repeat; a second press of the close button is ignored by the
  // parent, once the page is gone. The name's field is read-only while saving, though what it sends is still kept,
  // and until the date's order is known no field is drawn. The field sends a name other than the one shown, so that
  // the message does something.
  test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
    fc.assert(fc.property(state, fc.string({ minLength: 1 }), anyDay, (before, more, date) => {
      const model = makeModel(before)
      const text = `${Opt.match(fieldsOf(before), { onNone: () => '', onSome: ({ name }) => name })}${more}`
      const shownDays = model._tag !== 'Loading' && model.expiration.strip._tag === 'Naming'
        ? model.expiration.strip.choices.map((choice) => choice.date)
        : []
      const candidates = [
        Msg.NameTyped({ value: text }),
        Msg.NameCleared(),
        Msg.SaveStarted(),
        Msg.Closed(),
        ...digits.map((digit) => toDate(DateMsg.DigitTyped({ digit }))),
        toDate(DateMsg.DigitErased()),
        toDate(DateMsg.DateCleared()),
        ...[date, ...shownDays].map((day) => toDate(DateMsg.DateChosen({ date: day }))),
        ...DateOrder.all.map((order) => toDate(DateMsg.OrderPicked({ order }))),
      ]
      expect(dispatchViolations(program.update, {
        state: before,
        held: messagesSentBy<Model, Message>(view, model, text),
        candidates,
        repeatable: (msg) =>
          msg._tag === 'Closed'
          || (msg._tag === 'Expiration' && (msg.message._tag === 'DigitTyped' || msg.message._tag === 'DigitErased')),
        withheld: (msg, s) =>
          (msg._tag === 'NameTyped' && s.own.form._tag === 'Saving')
          || (makeModel(s)._tag === 'Loading' && msg._tag !== 'Closed' && msg._tag !== 'Expiration'),
      })).toEqual([])
    }))
  })

  test('NameTyped keeps the name as typed, while saving too, and is rejected while loading and once the product is gone', () => {
    assertProperty([state, fc.string()], (before, name) => {
      const form = before.own.form
      return form._tag === 'Editing' || form._tag === 'Saving'
        ? Equal.equals(step(Msg.NameTyped({ value: name }), before), {
          rejected: false,
          after: withOwn(before, { ...before.own, form: { ...form, fields: { ...form.fields, name } } }),
          commands: [],
          events: [],
        })
        : rejects(Msg.NameTyped({ value: name }), before)
    })
  })

  test('NameCleared empties the name, drawing the field anew, and is rejected with no name or off the form', () => {
    assertProperty([state], (before) => {
      const form = before.own.form
      return form._tag === 'Editing' && form.fields.name !== ''
        ? Equal.equals(step(Msg.NameCleared(), before), {
          rejected: false,
          after: withOwn(before, {
            ...before.own,
            form: { ...form, fields: { ...form.fields, name: '', replacements: form.fields.replacements + 1 } },
          }),
          commands: [],
          events: [],
        })
        : rejects(Msg.NameCleared(), before)
    })
  })

  test('SaveStarted saves the product made from the name and what the date concludes, once it differs from the stored one, and is rejected otherwise', () => {
    assertProperty([state], (before) => {
      const form = before.own.form
      if (form._tag !== 'Editing') return rejects(Msg.SaveStarted(), before)
      return Opt.match(savedProduct(before, form.fields), {
        onNone: () => rejects(Msg.SaveStarted(), before),
        onSome: (product) => {
          const { state: after, commands, events } = applyAll(program.update, [Msg.SaveStarted()], before)
          return Equal.equals(after.own, { ...before.own, form: { _tag: 'Saving', fields: form.fields, product } })
            && Equal.equals(commands, [Cmd.Save({ id: before.own.id, product })])
            && events.length === 0
            && DateTime.Equivalence(product.creationDate, before.own.original.creationDate)
        },
      })
    })
  })

  test('Closed asks the parent to leave the page, the changes discarded, and is rejected while saving', () => {
    assertProperty([state], (before) =>
      before.own.form._tag === 'Saving'
        ? rejects(Msg.Closed(), before)
        : Equal.equals(step(Msg.Closed(), before), {
          rejected: false,
          after: before,
          commands: [],
          events: [Ev.LeaveRequested()],
        }))
  })

  test('the back button, which the root tells, asks the parent to leave the page, and is held while saving', () => {
    assertProperty([state], (before) => {
      const { state: after, commands, events } = applyAll(program.external, [{ _tag: 'BackPressed' }], before)
      return after === before && commands.length === 0
        && Equal.equals(events, before.own.form._tag === 'Saving' ? [] : [Ev.LeaveRequested()])
    })
  })

  test('KeyboardMoved keeps how far the keyboard covers the page, in every state', () => {
    assertProperty(
      [state, keyboardInset],
      (before, inset) =>
        Equal.equals(
          step(Msg.KeyboardMoved({ inset }), before).after,
          withOwn(before, { ...before.own, keyboardInset: inset }),
        ),
    )
  })

  describe('the time', () => {
    test('ends the loading with the stored name in the fields, and tells the date the time, which then takes input', () => {
      assertProperty([loading, zoned], (before, now) => {
        const { state: after } = applyAll(program.update, [Msg.TimeChanged({ now })], before)
        return Equal.equals(after.own, {
          ...before.own,
          form: { _tag: 'Editing', fields: { now, name: before.own.original.name, replacements: 0 } },
        })
          && Equal.equals(dateOf(after), { ...dateOf(before), page: { maybeNow: Opt.some(now), isLocked: false } })
      })
    })

    test('is kept by the fields, and told to the date', () => {
      assertProperty([withFields, zoned], (before, now) => {
        const { state: after } = applyAll(program.update, [Msg.TimeChanged({ now })], before)
        return Equal.equals(Opt.map(fieldsOf(after), (fields) => fields.now), Opt.some(now))
          && Equal.equals(dateOf(after).page.maybeNow, Opt.some(now))
      })
    })
  })

  // The date takes no key from the moment the product is being saved: what it concludes is in the product.
  test('the date is told the time and whether the form is locked, after every step', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(!cannotArrive(msg, before))
      const result = program.update(msg)(before)
      const after = result === Tea.reject ? before : result.state
      return Equal.equals(dateOf(after).page, toldOf(after))
    })
  })

  test('Saved leaves the page once saved, gives the fields back with a snackbar on a failure, and keeps them without input, saying so, once the product is gone, each with a vibration', () => {
    assertProperty([saving, outcome], (before, outcome) => {
      const fields = Opt.getOrThrow(fieldsOf(before))
      const { state: after, commands, events } = applyAll(program.update, [Msg.Saved({ outcome })], before)
      const toldSnackbar = (failure: Failure) => {
        const { told } = snackbarOf(before)
        return Equal.equals(
          Opt.map(snackbarOf(after).maybeStanding, ({ id, notice }) => ({ id, notice })),
          Opt.some({ id: told, notice: failure }),
        )
          && commands[0] !== undefined && Equal.equals(commands[0], Cmd.Vibrate({ feedback: 'Reject' }))
          && commands.length === 2 && commands[1]?._tag === 'Snackbar'
          && events.length === 0
      }
      switch (outcome._tag) {
        case 'Saved':
          return Equal.equals(after.own, { ...before.own, form: { _tag: 'Editing', fields } })
            && Equal.equals(snackbarOf(after), snackbarOf(before))
            && Equal.equals(commands, [Cmd.Vibrate({ feedback: 'Confirm' })])
            && Equal.equals(events, [Ev.LeaveRequested()])
        case 'Failed':
          return Equal.equals(after.own, { ...before.own, form: { _tag: 'Editing', fields } })
            && toldSnackbar('SaveFailed')
        case 'Gone':
          return Equal.equals(after.own, { ...before.own, form: { _tag: 'Gone', fields } })
            && toldSnackbar('ProductGone')
      }
    })
  })

  describe('an order not kept', () => {
    const notKept = toDate(DateMsg.OrderKept({ succeeded: false }))

    test('is told by a snackbar, over the one standing, and a vibration, while the form is there', () => {
      assertProperty([fc.oneof(editing, saving)], (before) => {
        const { state: after, commands, events } = applyAll(program.update, [notKept], before)
        return Equal.equals(after.own, before.own)
          && Equal.equals(
            Opt.map(snackbarOf(after).maybeStanding, ({ id, notice }) => ({ id, notice })),
            Opt.some({ id: snackbarOf(before).told, notice: 'OrderNotKept' }),
          )
          && Equal.equals(commands[0], Cmd.Vibrate({ feedback: 'Reject' })) && commands[1]?._tag === 'Snackbar'
          && events.length === 0
      })
    })

    // The snackbar telling that the product is gone stands until the page goes.
    test('tells nothing once the product is gone', () => {
      assertProperty([gone], (before) =>
        Equal.equals(applyAll(program.update, [notKept], before), {
          state: before,
          commands: [],
          events: [],
        }))
    })

    test('tells nothing when the order was kept', () => {
      assertProperty(
        [fc.oneof(editing, saving, gone)],
        (before) =>
          Equal.equals(applyAll(program.update, [toDate(DateMsg.OrderKept({ succeeded: true }))], before), {
            state: before,
            commands: [],
            events: [],
          }),
      )
    })
  })

  describe('a snackbar that has stood its time', () => {
    const expired = (s: Whole) => toSnackbar({ _tag: 'Expired', id: Opt.getOrThrow(snackbarOf(s).maybeStanding).id })

    test('asks to leave the page once the product is gone', () => {
      assertProperty([gone], (before) => {
        const { state: after, events } = applyAll(program.update, [expired(before)], before)
        return Equal.equals(after.own, before.own) && Opt.isNone(snackbarOf(after).maybeStanding)
          && Equal.equals(events, [Ev.LeaveRequested()])
      })
    })

    // An event keeps the timing of its cause: the page has nothing to add.
    test('leaves, and asks nothing, while the form is there', () => {
      assertProperty([fc.oneof(editing, saving)], (before) => {
        fc.pre(Opt.isSome(snackbarOf(before).maybeStanding))
        const { state: after, commands, events } = applyAll(program.update, [expired(before)], before)
        return Equal.equals(after.own, before.own) && Opt.isNone(snackbarOf(after).maybeStanding)
          && commands.length === 0 && events.length === 0
      })
    })
  })
})

// The root drops the page once it is left: it listens for as long as it is there. The back button is the root's.
test('the page listens to the clock and the keyboard in every state, its date to the setting of its order, and times its snackbar', () => {
  assertProperty([state], (s) => {
    const keys = program.subscriptions(s)
    const own = keys.filter((key) => typeof key === 'string')
    const ofDate = keys.filter((key) => typeof key !== 'string' && key._tag === 'Expiration')
    const ofSnackbar = keys.filter((key) => typeof key !== 'string' && key._tag === 'Snackbar')
    const timed = Opt.exists(snackbarOf(s).maybeStanding, ({ maybeUntil }) => Opt.isSome(maybeUntil))
    return Equal.equals(own, ['clock', 'keyboard'])
      && ofDate.length === 1
      && ofSnackbar.length === (timed ? 1 : 0)
  })
})

// Guards against the properties above passing only on rejections.
test('the arbitrary states describe a product to save at times, and at times not, without a date, and before the order is known', () => {
  const models = fc.sample(editing, 1_000).map(makeModel)
  expect(models.some((model) => model._tag === 'Loading')).toBe(true)
  expect(models.some((model) => model._tag === 'Editing' && Opt.isSome(model.maybeSave))).toBe(true)
  expect(models.some((model) => model._tag === 'Editing' && Opt.isNone(model.maybeSave))).toBe(true)
  expect(models.some((model) => model._tag === 'Editing' && model.withoutDate)).toBe(true)
  expect(models.some((model) => model._tag === 'Editing' && Opt.isSome(model.snackbar))).toBe(true)
})

describe('the model', () => {
  // A function in a model, made anew by each `makeModel`, would tell the two apart.
  test('is data: equal states, built apart, have equal models', () => {
    fc.assert(fc.property(fc.integer(), (seed) => {
      const [one] = fc.sample(state, { seed, numRuns: 1 })
      const [other] = fc.sample(state, { seed, numRuns: 1 })
      if (one === undefined || other === undefined) throw new Error('Nothing sampled')
      expect(one).not.toBe(other)
      expect(Equal.equals(makeModel(one), makeModel(other))).toBe(true)
    }))
  })

  // The stored date is drawn as digits in the order in use: the fields wait for it.
  test('draws the app bar alone while loading, and until the date\'s order is known', () => {
    assertProperty([state], (s) => {
      const isWaiting = s.own.form._tag === 'Loading' || Opt.isNone(dateOf(s).maybeOrder)
      return Equal.equals(makeModel(s), { _tag: 'Loading', keyboardInset: s.own.keyboardInset, close: Msg.Closed() })
        === isWaiting
    })
  })

  test('draws in every state how far the page keeps clear of the keyboard', () => {
    assertProperty([state], (s) => makeModel(s).keyboardInset === s.own.keyboardInset)
  })

  test('shows the name, the date\'s model and the snackbar\'s, and saving without a date when the date concludes on none', () => {
    assertProperty([shown], (s) => {
      const model = makeModel(s)
      const fields = Opt.getOrThrow(fieldsOf(s))
      const date = dateOf(s)
      return model._tag !== 'Loading' && model.name === fields.name && model.nameKey === fields.replacements
        && Equal.equals(model.expiration, Expiration.program.makeModel(date))
        && Equal.equals(
          model.snackbar,
          Opt.map(snackbarOf(s).maybeStanding, ({ id, notice, entrance }) => ({ id, notice, entrance })),
        )
        && model.withoutDate === (Expiration.program.output(date)._tag === 'Never')
    })
  })

  test('offers to type the name, to clear it while there is one, and to save exactly while the fields describe a product other than the stored one', () => {
    assertProperty([shown.filter((s) => s.own.form._tag === 'Editing')], (s) => {
      const model = makeModel(s)
      const fields = Opt.getOrThrow(fieldsOf(s))
      return model._tag === 'Editing'
        && Equal.equals(model.nameTyped, { _tag: 'NameTyped' })
        && Equal.equals(model.maybeClearName, fields.name !== '' ? Opt.some(Msg.NameCleared()) : Opt.none())
        && Equal.equals(model.maybeSave, Opt.map(savedProduct(s, fields), () => Msg.SaveStarted()))
    })
  })

  test('offers nothing while saving, and only to close once the product is gone', () => {
    assertProperty([shown.filter((s) => s.own.form._tag !== 'Editing')], (s) => {
      const model = makeModel(s)
      return s.own.form._tag === 'Gone'
        ? model._tag === 'Gone' && Equal.equals(model.close, Msg.Closed())
        : model._tag === 'Saving'
    })
  })

  describe('on a product', () => {
    const id = nthId(1)
    const creationDate = DateTime.makeZonedUnsafe('2026-10-20T10:00:00Z', { timeZone: 'Europe/Rome' })
    const now = DateTime.makeZonedUnsafe('2026-10-28T12:00:00Z', { timeZone: 'Europe/Rome' })
    const day = Schema.decodeSync(Day.Schema)
    const milk = Opt.getOrThrow(
      Product.make({ name: 'Milk', creationDate, maybeExpirationDate: Opt.some(day('2026-11-05')) }),
    )
    const everlasting = Opt.getOrThrow(Product.make({ name: 'Salt', creationDate, maybeExpirationDate: Opt.none() }))
    /** The page on `original`, its name and its date as given, the date read in `DMY`. */
    const opened = (
      { original = milk, name = original.name, date = { _tag: 'Kept' } }: Readonly<{
        original?: Product.Product
        name?: string
        date?: Expiration.DateForm
      }>,
    ) =>
      stateOf(program, {
        id,
        original,
        keyboardInset: 0,
        form: { _tag: 'Editing', fields: { now, name, replacements: 0 } },
      }, {
        Expiration: {
          maybeStored: Opt.some(original),
          page: { maybeNow: Opt.some(now), isLocked: false },
          maybeOrder: Opt.some<DateOrder.DateOrder>('DMY'),
          date,
        },
      })
    const typed = (digits: string): Expiration.DateForm => ({
      _tag: 'Typed',
      entry: { digits, maybeChosenDate: Opt.none() },
    })
    const save = (s: Whole) => {
      const model = makeModel(s)
      return model._tag === 'Editing' ? model.maybeSave : Opt.none()
    }

    test('withholds "Save" on the product unchanged, on a blank name and on digits naming no day', () => {
      expect(Opt.isNone(save(opened({})))).toBe(true)
      expect(Opt.isNone(save(opened({ name: '  Milk ' })))).toBe(true)
      expect(Opt.isNone(save(opened({ date: typed('05112026') })))).toBe(true)
      expect(Opt.isNone(save(opened({ name: '   ' })))).toBe(true)
      expect(Opt.isNone(save(opened({ date: typed('4040') })))).toBe(true)
    })

    test('offers "Save" on each kind of change, and "Save without date" on no digits', () => {
      const withoutDate = makeModel(opened({ date: typed('') }))
      expect(Opt.isSome(save(opened({ name: 'Oat milk' })))).toBe(true)
      expect(Opt.isSome(save(opened({ date: typed('06112026') })))).toBe(true)
      expect(withoutDate._tag === 'Editing' && Opt.isSome(withoutDate.maybeSave) && withoutDate.withoutDate).toBe(true)
      expect(Opt.isSome(save(opened({ original: everlasting, date: typed('0612') })))).toBe(true)
    })

    test('saves the day the digits name, the creation date kept', () => {
      const { commands } = applyAll(program.update, [Msg.SaveStarted()], opened({ date: typed('06112026') }))
      expect(commands).toEqual([
        Cmd.Save({
          id,
          product: Opt.getOrThrow(
            Product.edit(milk, { name: 'Milk', maybeExpirationDate: Opt.some(day('2026-11-06')) }, now.zone),
          ),
        }),
      ])
    })
  })
})

// Guards against a variant that the arbitraries never make.
test('the arbitrary states cover every state, with a snackbar and without', () => {
  const states = fc.sample(state, 1_000)
  expect(states.some((s) => s.own.form._tag === 'Loading')).toBe(true)
  expect(states.some((s) => s.own.form._tag === 'Editing')).toBe(true)
  expect(states.some((s) => s.own.form._tag === 'Saving')).toBe(true)
  expect(states.some((s) => s.own.form._tag === 'Gone')).toBe(true)
  expect(states.some((s) => s.own.form._tag !== 'Gone' && Opt.isSome(snackbarOf(s).maybeStanding))).toBe(true)
  expect(states.some((s) => s.own.form._tag !== 'Loading' && Opt.isNone(snackbarOf(s).maybeStanding))).toBe(true)
})

test('the arbitrary messages cover every message of the page', () => {
  const tags = new Set(fc.sample(message, 1_000).map((msg) => msg._tag))
  expect([...tags].sort()).toEqual(
    ['Closed', 'KeyboardMoved', 'NameCleared', 'NameTyped', 'SaveStarted', 'Saved', 'TimeChanged'],
  )
})
