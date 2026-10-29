import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Equal from 'effect/Equal'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as Product from '#domain/product.ts'
import { arbitrary as order } from '#libs/dates/date-order.test_arbitrary.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import * as DigitDateEntry from '#libs/dates/digit-date-entry.ts'
import * as DigitDates from '#libs/dates/digit-dates.ts'
import { messagesSentBy } from '#libs/tea-snabbdom/view.test_support.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import { digit, editing, gone, loading, message, outcome, saving, state } from './program.test_arbitrary.ts'
import {
  type Command,
  type Digit,
  type Event,
  type Failure,
  type Form,
  type Message,
  type Model,
  program,
  type Snackbar,
  type State,
} from './program.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()
const Ev = Data.taggedEnum<Event>()

const { outcome: outcomeOf, rejects, step } = outcomesOf(program.update)

const { makeModel } = program

const digits: ReadonlyArray<Digit> = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/** The entry the fields show: the stored date's digits in the order in use until a key is pressed. */
const entryShown = (form: Form): DigitDateEntry.Entry =>
  form.date._tag === 'Typed'
    ? form.date.entry
    : {
      digits: Opt.match(form.original.maybeExpirationDate, {
        onNone: () => '',
        onSome: (date) => DigitDates.digitsOf(date, form.order),
      }),
      maybeChosenDate: Opt.none(),
    }

/** The days the page offers: those the digits name, from the day the product was created on. */
const offeredDates = (form: Form) =>
  DigitDateEntry.offered(entryShown(form), form.now, form.order, Product.canExpireOn(form.original.creationDate))

/** Whether more digits typed after those shown can name a day the product may expire on. */
const canCompleteDate = (form: Form) =>
  DigitDateEntry.canComplete(entryShown(form), form.now, form.order, Product.canExpireOn(form.original.creationDate))

/** The product the fields describe: the stored date while untouched, none on no digits, or the day named. */
const productOf = (form: Form): Opt.Option<Product.Product> => {
  const maybeExpiration = form.date._tag === 'Kept'
    ? Opt.some(form.original.maybeExpirationDate)
    : form.date.entry.digits === ''
    ? Opt.some(Opt.none())
    : Opt.map(DigitDateEntry.named(form.date.entry, offeredDates(form)), Opt.some)
  return Opt.flatMap(
    maybeExpiration,
    (maybeExpirationDate) =>
      Product.make({ name: form.name, creationDate: form.original.creationDate, maybeExpirationDate }),
  )
}

const dayOf = (date: DateTime.Utc) => DateTime.formatIsoDateUtc(date)

/** The product "Save" writes: the one the fields describe, when it differs from the stored one by its name or day. */
const savedProduct = (form: Form) =>
  Opt.filter(productOf(form), (product) =>
    product.name !== form.original.name
    || !Equal.equals(
      Opt.map(product.maybeExpirationDate, dayOf),
      Opt.map(form.original.maybeExpirationDate, dayOf),
    ))

const withForm = (state: State & { _tag: 'Editing' | 'Saving' | 'Gone' }, change: Partial<Form>): State => ({
  ...state,
  form: { ...state.form, ...change },
})

/** The snackbar of a failure, after the one standing, if any. */
const told = (form: Form, failure: Failure): Snackbar =>
  form.snackbar._tag === 'Shown'
    ? { _tag: 'Shown', id: form.snackbar.id + 1, failure, entrance: 'AfterAnother' }
    : { _tag: 'Shown', id: 0, failure, entrance: 'Alone' }

/** A completion while nothing is being saved, an order kept before any was picked, a snackbar's end without one. */
const cannotArrive = (msg: Message, before: State) =>
  (msg._tag === 'Saved' && before._tag !== 'Saving') || (msg._tag === 'OrderKept' && before._tag === 'Loading')
  || (msg._tag === 'SnackbarExpired' && (before._tag === 'Loading' || before.form.snackbar._tag === 'None'))

const notEditing = fc.oneof(loading, saving, gone)

const withFields = fc.oneof(editing, saving, gone)

describe('EditProduct update', () => {
  test('is total and deterministic, but for a message that cannot arrive', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(!cannotArrive(msg, before))
      return Equal.equals(outcomeOf(msg, before), outcomeOf(msg, before))
    })
  })

  test('a message that cannot arrive is a defect', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(cannotArrive(msg, before))
      expect(() => program.update(msg)(before)).toThrow(Tea.InvariantDefect)
      return true
    })
  })

  // The digit keys and the backspace are meant to repeat; a second press of the close button is ignored by the
  // parent, once the page is gone. The name's input is disabled while saving.
  test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
    const check = dispatchViolations(program.update, {
      repeatable: (msg) => msg._tag === 'DigitTyped' || msg._tag === 'DigitErased' || msg._tag === 'Closed',
      withheld: (msg, state) => msg._tag === 'NameChanged' && state._tag === 'Saving',
    })
    fc.assert(fc.property(state, fc.string(), utc, (before, inputValue, date) => {
      const offered = before._tag === 'Loading' ? [] : offeredDates(before.form)
      const askable = [
        Msg.NameChanged({ name: inputValue }),
        Msg.NameCleared(),
        ...digits.map((digit) => Msg.DigitTyped({ digit })),
        Msg.DigitErased(),
        Msg.DateCleared(),
        ...[date, ...offered].map((day) => Msg.DateChosen({ date: day })),
        ...DateOrder.all.map((order) => Msg.OrderPicked({ order })),
        Msg.SaveStarted(),
        Msg.Closed(),
      ]
      expect(check(before, messagesSentBy<Model, Message>(view, makeModel(before), inputValue), askable)).toEqual([])
    }))
  })

  test('NameChanged keeps the name as typed, while saving too, and is rejected while loading and once the product is gone', () => {
    assertProperty([state, fc.string()], (before, name) =>
      before._tag === 'Loading' || before._tag === 'Gone'
        ? rejects(Msg.NameChanged({ name }), before)
        : Equal.equals(step(Msg.NameChanged({ name }), before), {
          rejected: false,
          after: withForm(before, { name }),
          commands: [],
          events: [],
        }))
  })

  test('NameCleared empties the name, drawing the input anew, and is rejected with no name or off the form', () => {
    assertProperty([state], (before) =>
      before._tag === 'Editing' && before.form.name !== ''
        ? Equal.equals(step(Msg.NameCleared(), before), {
          rejected: false,
          after: withForm(before, { name: '', replacements: before.form.replacements + 1 }),
          commands: [],
          events: [],
        })
        : rejects(Msg.NameCleared(), before))
  })

  describe('the keypad', () => {
    /** The form after a key, by its rule on the entry shown: rejected where the rule does not apply. */
    const acts = (
      before: State & { _tag: 'Editing' },
      msg: Message,
      rule: (entry: DigitDateEntry.Entry) => Opt.Option<DigitDateEntry.Entry>,
    ) =>
      Opt.match(rule(entryShown(before.form)), {
        onNone: () => rejects(msg, before),
        onSome: (entry) => Equal.equals(step(msg, before).after, withForm(before, { date: { _tag: 'Typed', entry } })),
      })

    test('types, erases and clears the digits shown, the stored date\'s at first, as the rules say', () => {
      assertProperty(
        [editing, digit],
        (before, typed) =>
          acts(before, Msg.DigitTyped({ digit: typed }), DigitDateEntry.typeDigit(typed))
          && acts(before, Msg.DigitErased(), DigitDateEntry.eraseDigit)
          && acts(before, Msg.DateCleared(), DigitDateEntry.clear),
      )
    })

    test('picks a day the digits name, unless it is the one named, and is rejected on any other', () => {
      assertProperty(
        [editing, utc],
        (before, other) =>
          [...offeredDates(before.form), other].every((date) =>
            acts(before, Msg.DateChosen({ date }), DigitDateEntry.choose(date, offeredDates(before.form)))
          ),
      )
    })

    // A stored date is a date's longest: its digits take no more.
    test('a digit on the untouched stored date is rejected; the backspace erases its last digit', () => {
      assertProperty([editing, digit], (before, typed) => {
        fc.pre(before.form.date._tag === 'Kept' && Opt.isSome(before.form.original.maybeExpirationDate))
        const digits = entryShown(before.form).digits
        return rejects(Msg.DigitTyped({ digit: typed }), before)
          && Equal.equals(
            step(Msg.DigitErased(), before).after,
            withForm(before, {
              date: { _tag: 'Typed', entry: { digits: digits.slice(0, -1), maybeChosenDate: Opt.none() } },
            }),
          )
      })
    })

    test('is rejected while loading, while saving and once the product is gone', () => {
      assertProperty(
        [notEditing, digit, utc],
        (before, typed, date) =>
          rejects(Msg.DigitTyped({ digit: typed }), before) && rejects(Msg.DigitErased(), before)
          && rejects(Msg.DateCleared(), before) && rejects(Msg.DateChosen({ date }), before),
      )
    })
  })

  // The pick applies at once, and is kept in the setting, which reports it back.
  test('OrderPicked takes another order than the one in use and keeps it, and is rejected otherwise', () => {
    assertProperty([state, order], (before, picked) =>
      before._tag === 'Editing' && before.form.order !== picked
        ? Equal.equals(step(Msg.OrderPicked({ order: picked }), before), {
          rejected: false,
          after: withForm(before, { order: picked }),
          commands: [Cmd.KeepOrder({ order: picked })],
          events: [],
        })
        : rejects(Msg.OrderPicked({ order: picked }), before))
  })

  test('SaveStarted saves the product the fields describe, once it differs from the stored one, and is rejected otherwise', () => {
    assertProperty([state], (before) => {
      if (before._tag !== 'Editing') return rejects(Msg.SaveStarted(), before)
      return Opt.match(savedProduct(before.form), {
        onNone: () => rejects(Msg.SaveStarted(), before),
        onSome: (product) =>
          Equal.equals(step(Msg.SaveStarted(), before), {
            rejected: false,
            after: { _tag: 'Saving', form: before.form, product },
            commands: [Cmd.Save({ id: before.form.id, product })],
            events: [],
          }) && DateTime.Equivalence(product.creationDate, before.form.original.creationDate),
      })
    })
  })

  test('Closed asks the parent to leave the page, the changes discarded, and is rejected while saving', () => {
    assertProperty([state], (before) =>
      before._tag === 'Saving'
        ? rejects(Msg.Closed(), before)
        : Equal.equals(step(Msg.Closed(), before), {
          rejected: false,
          after: before,
          commands: [],
          events: [Ev.LeaveRequested()],
        }))
  })

  test('BackPressed asks the parent to leave the page, and is held while saving', () => {
    assertProperty([state], (before) =>
      Equal.equals(step(Msg.BackPressed(), before), {
        rejected: false,
        after: before,
        commands: [],
        events: before._tag === 'Saving' ? [] : [Ev.LeaveRequested()],
      }))
  })

  describe('the time and the order', () => {
    test('are kept by the form, in the order\'s case with the stored date shown in it', () => {
      assertProperty(
        [withFields, utc, order],
        (before, now, order) =>
          Equal.equals(step(Msg.TimeChanged({ now }), before).after, withForm(before, { now }))
          && Equal.equals(step(Msg.OrderChanged({ order }), before).after, withForm(before, { order })),
      )
    })

    test('end the loading once both are known, with the stored product in the fields', () => {
      assertProperty([loading, utc, order], (before, now, order) => {
        const afterTime = step(Msg.TimeChanged({ now }), before).after
        const afterOrder = step(Msg.OrderChanged({ order }), before).after
        const form: Omit<Form, 'now' | 'order'> = {
          id: before.id,
          original: before.original,
          name: before.original.name,
          replacements: 0,
          date: { _tag: 'Kept' },
          snackbar: { _tag: 'None' },
        }
        return Equal.equals(
          afterTime,
          Opt.match(before.maybeOrder, {
            onNone: () => ({ ...before, maybeNow: Opt.some(now) }),
            onSome: (order) => ({ _tag: 'Editing', form: { ...form, now, order } }),
          }),
        )
          && Equal.equals(
            afterOrder,
            Opt.match(before.maybeNow, {
              onNone: () => ({ ...before, maybeOrder: Opt.some(order) }),
              onSome: (now) => ({ _tag: 'Editing', form: { ...form, now, order } }),
            }),
          )
      })
    })
  })

  test('OrderKept changes nothing, and says so with a snackbar, after the one standing, and a vibration when the order could not be kept', () => {
    assertProperty(
      [fc.oneof(editing, saving), fc.boolean()],
      (before, succeeded) =>
        Equal.equals(step(Msg.OrderKept({ succeeded }), before), {
          rejected: false,
          after: succeeded ? before : withForm(before, { snackbar: told(before.form, 'OrderNotKept') }),
          commands: succeeded ? [] : [Cmd.Vibrate({ feedback: 'Reject' })],
          events: [],
        }),
    )
  })

  // The snackbar telling that the product is gone stands until the page goes.
  test('OrderKept changes nothing once the product is gone, and tells nothing', () => {
    assertProperty(
      [gone, fc.boolean()],
      (before, succeeded) =>
        Equal.equals(step(Msg.OrderKept({ succeeded }), before), {
          rejected: false,
          after: before,
          commands: [],
          events: [],
        }),
    )
  })

  test('Saved leaves the page once saved, gives the form back with a snackbar on a failure, and keeps it without input, saying so, once the product is gone, each with a vibration', () => {
    assertProperty([saving, outcome], (before, outcome) => {
      const editing: State = { _tag: 'Editing', form: before.form }
      const expected = {
        Saved: {
          after: editing,
          commands: [Cmd.Vibrate({ feedback: 'Confirm' })],
          events: [Ev.LeaveRequested()],
        },
        Failed: {
          after: { _tag: 'Editing', form: { ...before.form, snackbar: told(before.form, 'SaveFailed') } },
          commands: [Cmd.Vibrate({ feedback: 'Reject' })],
          events: [],
        },
        Gone: {
          after: { _tag: 'Gone', form: { ...before.form, snackbar: told(before.form, 'ProductGone') } },
          commands: [Cmd.Vibrate({ feedback: 'Reject' })],
          events: [],
        },
      }[outcome._tag]
      return Equal.equals(step(Msg.Saved({ outcome }), before), { rejected: false, ...expected })
    })
  })

  describe('SnackbarExpired', () => {
    test('withdraws the snackbar, and asks to leave the page once the product is gone', () => {
      assertProperty([withFields], (before) => {
        fc.pre(before.form.snackbar._tag === 'Shown')
        return Equal.equals(step(Msg.SnackbarExpired(), before), {
          rejected: false,
          after: withForm(before, { snackbar: { _tag: 'None' } }),
          commands: [],
          events: before._tag === 'Gone' ? [Ev.LeaveRequested()] : [],
        })
      })
    })

    // The timer runs only while a snackbar is shown, so its end heard otherwise is a bug.
    test('is a defect when no snackbar is shown', () => {
      assertProperty([state], (before) => {
        fc.pre(before._tag === 'Loading' || before.form.snackbar._tag === 'None')
        expect(() => program.update(Msg.SnackbarExpired())(before)).toThrow(Tea.InvariantDefect)
        return true
      })
    })
  })
})

// The snackbar's timer is keyed by its id: the next one starts it anew.
test('the page listens to the clock, the date order and the back button in every state, and times the snackbar', () => {
  assertProperty([state], (s) => {
    const subscriptions = Tea.subscriptionsOf(program)(s)
    const snackbar = s._tag === 'Loading' ? { _tag: 'None' } as const : s.form.snackbar
    return HashMap.size(subscriptions) === (snackbar._tag === 'Shown' ? 4 : 3) && HashMap.has(subscriptions, 'clock')
      && HashMap.has(subscriptions, 'date-order') && HashMap.has(subscriptions, 'back-button')
      && (snackbar._tag === 'None' || HashMap.has(subscriptions, `snackbar:${snackbar.id}`))
  })
})

// Guards against the properties above passing only on rejections.
test('the arbitrary forms describe a product to save at times, and at times not, with days to pick', () => {
  const models = fc.sample(editing, 1_000).map(makeModel)
  const choices = models.flatMap((model) =>
    model._tag === 'Editing' && model.strip._tag === 'Naming' ? model.strip.choices : []
  )
  expect(models.some((model) => model._tag === 'Editing' && Opt.isSome(model.maybeSave))).toBe(true)
  expect(models.some((model) => model._tag === 'Editing' && Opt.isNone(model.maybeSave))).toBe(true)
  expect(models.some((model) => model._tag === 'Editing' && model.strip._tag === 'Empty')).toBe(true)
  expect(models.some((model) => model._tag === 'Editing' && model.strip._tag === 'NamingNothing')).toBe(true)
  expect(choices.some((choice) => choice.choice._tag === 'Chosen')).toBe(true)
  expect(choices.some((choice) => choice.choice._tag === 'Offered')).toBe(true)
  expect(models.some((model) => model._tag === 'Editing' && Opt.isSome(model.maybeTypeDigit))).toBe(true)
  expect(models.some((model) => model._tag === 'Editing' && Opt.isNone(model.maybeTypeDigit))).toBe(true)
})

describe('the model', () => {
  test('draws the app bar alone while loading', () => {
    assertProperty([loading], (s) => Equal.equals(makeModel(s), { _tag: 'Loading', close: Msg.Closed() }))
  })

  // The digits of the stored date name its day alone, which is the day named.
  test('shows the untouched stored date as its digits in the order in use, its one chip chosen, or no expiration', () => {
    assertProperty([editing, order], (s, other) => {
      fc.pre(s.form.date._tag === 'Kept')
      const shownIn = (form: Form) => {
        const model = makeModel({ _tag: 'Editing', form })
        return Opt.match(form.original.maybeExpirationDate, {
          onNone: () => model._tag === 'Editing' && model.digits === '' && model.strip._tag === 'Empty',
          onSome: (date) =>
            model._tag === 'Editing' && model.digits === DigitDates.digitsOf(date, form.order)
            && Equal.equals(model.strip, {
              _tag: 'Naming',
              choices: [{ date: DateTime.startOf(date, 'day'), choice: { _tag: 'Chosen' } }],
            }),
        })
      }
      return shownIn(s.form) && shownIn({ ...s.form, order: other })
    })
  })

  test('shows typed digits as typed, with nothing while they name no day yet, the days they name and the one named, or that no more digits can name one', () => {
    assertProperty([withFields], (s) => {
      fc.pre(s.form.date._tag === 'Typed')
      const model = makeModel(s)
      const entry = entryShown(s.form)
      const offered = offeredDates(s.form)
      const named = DigitDateEntry.named(entry, offered)
      const expected = entry.digits === ''
        ? { _tag: 'Empty' }
        : offered.length === 0
        ? canCompleteDate(s.form) ? { _tag: 'NamingNothingYet' } : { _tag: 'NamingNothing' }
        : {
          _tag: 'Naming',
          choices: offered.map((date) => ({
            date,
            choice: Opt.contains(named, date)
              ? { _tag: 'Chosen' }
              : {
                _tag: 'Offered',
                maybeChoose: s._tag === 'Editing' ? Opt.some(Msg.DateChosen({ date })) : Opt.none(),
              },
          })),
        }
      return model._tag !== 'Loading' && model.digits === entry.digits && Equal.equals(model.strip, expected)
        && model.name === s.form.name && model.nameKey === s.form.replacements
    })
  })

  test('shows the order in use with the others to pick, exactly while update accepts them', () => {
    assertProperty([withFields], (s) => {
      const model = makeModel(s)
      return model._tag !== 'Loading' && model.order === s.form.order
        && Equal.equals(
          model.orders,
          DateOrder.all.map((order) => ({
            order,
            choice: order === s.form.order
              ? { _tag: 'Current' }
              : {
                _tag: 'Offered',
                maybePick: rejects(Msg.OrderPicked({ order }), s) ? Opt.none() : Opt.some(Msg.OrderPicked({ order })),
              },
          })),
        )
    })
  })

  test('offers each key exactly where its rule applies to the entry shown, and the name\'s clearing while there is one', () => {
    assertProperty([editing, digit], (s, typed) => {
      const model = makeModel(s)
      const entry = entryShown(s.form)
      return model._tag === 'Editing'
        && Equal.equals(
          Opt.map(model.maybeTypeDigit, (type) => type(typed)),
          Opt.map(DigitDateEntry.typeDigit(typed)(entry), () => Msg.DigitTyped({ digit: typed })),
        )
        && Equal.equals(model.maybeEraseDigit, Opt.map(DigitDateEntry.eraseDigit(entry), () => Msg.DigitErased()))
        && Equal.equals(model.maybeClearDate, Opt.map(DigitDateEntry.clear(entry), () => Msg.DateCleared()))
        && Equal.equals(model.maybeClearName, s.form.name !== '' ? Opt.some(Msg.NameCleared()) : Opt.none())
    })
  })

  test('offers to save exactly while the fields describe a product other than the stored one', () => {
    assertProperty([editing], (s) => {
      const model = makeModel(s)
      return model._tag === 'Editing'
        && Equal.equals(model.maybeSave, Opt.map(savedProduct(s.form), () => Msg.SaveStarted()))
    })
  })

  test('offers nothing while saving, and only to close once the product is gone', () => {
    assertProperty([fc.oneof(saving, gone)], (s) => {
      const model = makeModel(s)
      const choices = model._tag !== 'Loading' && model.strip._tag === 'Naming' ? model.strip.choices : []
      return model._tag === (s._tag === 'Gone' ? 'Gone' : 'Saving')
        && (model._tag !== 'Gone' || Equal.equals(model.close, Msg.Closed()))
        && model.orders.every(({ choice }) => choice._tag === 'Current' || Opt.isNone(choice.maybePick))
        && choices.every(({ choice }) => choice._tag === 'Chosen' || Opt.isNone(choice.maybeChoose))
    })
  })

  test('shows the snackbar the form holds, in every state but loading', () => {
    assertProperty([withFields], (s) => {
      const model = makeModel(s)
      return model._tag !== 'Loading' && Equal.equals(model.snackbar, s.form.snackbar)
    })
  })

  describe('on a product', () => {
    const creationDate = DateTime.makeUnsafe('2026-10-20T10:00:00Z')
    const now = DateTime.makeUnsafe('2026-10-28T12:00:00Z')
    const day = (iso: string) => DateTime.makeUnsafe(`${iso}T00:00:00Z`)
    const milk = Opt.getOrThrow(
      Product.make({ name: 'Milk', creationDate, maybeExpirationDate: Opt.some(day('2026-11-05')) }),
    )
    const opened: Form = {
      id: '1',
      original: milk,
      name: 'Milk',
      replacements: 0,
      now,
      order: 'DMY',
      date: { _tag: 'Kept' },
      snackbar: { _tag: 'None' },
    }
    const typed = (digits: string): Form => ({
      ...opened,
      date: { _tag: 'Typed', entry: { digits, maybeChosenDate: Opt.none() } },
    })
    const save = (form: Form) => {
      const model = makeModel({ _tag: 'Editing', form })
      return model._tag === 'Editing' ? model.maybeSave : Opt.none()
    }
    const strip = (form: Form) => {
      const model = makeModel({ _tag: 'Editing', form })
      return model._tag === 'Editing' ? model.strip : undefined
    }

    test('withholds "Save" on the product unchanged, on a blank name and on digits naming no day', () => {
      expect(Opt.isNone(save(opened))).toBe(true)
      expect(Opt.isNone(save({ ...opened, name: '  Milk ' }))).toBe(true)
      expect(Opt.isNone(save(typed('05112026')))).toBe(true)
      expect(Opt.isNone(save({ ...opened, name: '   ' }))).toBe(true)
      expect(Opt.isNone(save(typed('4040')))).toBe(true)
    })

    test('offers "Save" on each kind of change', () => {
      const everlasting = Opt.getOrThrow(Product.make({ name: 'Salt', creationDate, maybeExpirationDate: Opt.none() }))
      expect(Opt.isSome(save({ ...opened, name: 'Oat milk' }))).toBe(true)
      expect(Opt.isSome(save(typed('06112026')))).toBe(true)
      expect(Opt.isSome(save(typed('')))).toBe(true)
      expect(Opt.isSome(save({ ...typed('0612'), original: everlasting, name: 'Salt' }))).toBe(true)
    })

    // A day typed with its year may be past: a typo corrected, or a product bought past its date.
    test('offers a day between the creation day and today, and never a day before the creation day', () => {
      expect(strip(typed('22102026'))).toEqual({
        _tag: 'Naming',
        choices: [{ date: day('2026-10-22'), choice: { _tag: 'Chosen' } }],
      })
      expect(strip(typed('20102026'))?._tag).toBe('Naming')
      expect(strip(typed('19102026'))).toEqual({ _tag: 'NamingNothing' })
    })

    // Typing a date with its year, the fifth to the seventh digit name no day: a year of one or three digits, or
    // one of two already past.
    test('says nothing while more digits can name a day, and that the digits name none once none can', () => {
      expect(strip(typed('06112'))).toEqual({ _tag: 'NamingNothingYet' })
      expect(strip(typed('061120'))).toEqual({ _tag: 'NamingNothingYet' })
      expect(strip(typed('0611202'))).toEqual({ _tag: 'NamingNothingYet' })
      expect(strip(typed('0611201'))).toEqual({ _tag: 'NamingNothing' })
      expect(strip(typed('00'))).toEqual({ _tag: 'NamingNothing' })
    })

    test('rewrites the untouched stored date in another order, and leaves typed digits as typed', () => {
      const inMdy = makeModel({ _tag: 'Editing', form: { ...opened, order: 'MDY' } })
      const typedInMdy = makeModel({ _tag: 'Editing', form: { ...typed('0511'), order: 'MDY' } })
      expect(inMdy._tag === 'Editing' && inMdy.digits).toBe('11052026')
      expect(typedInMdy._tag === 'Editing' && typedInMdy.digits).toBe('0511')
    })
  })
})

// Guards against a variant that the arbitraries never make.
test('the arbitrary states cover every state and both dates', () => {
  const states = fc.sample(state, 1_000)
  expect(states.some((s) => s._tag === 'Loading')).toBe(true)
  expect(states.some((s) => s._tag === 'Editing' && s.form.date._tag === 'Kept')).toBe(true)
  expect(states.some((s) => s._tag === 'Editing' && s.form.date._tag === 'Typed')).toBe(true)
  expect(states.some((s) => s._tag === 'Saving')).toBe(true)
  expect(states.some((s) => s._tag === 'Gone' && s.form.snackbar._tag === 'Shown')).toBe(true)
  expect(states.some((s) => s._tag !== 'Loading' && s.form.snackbar._tag === 'None')).toBe(true)
  expect(states.some((s) => s._tag !== 'Loading' && s.form.snackbar._tag === 'Shown')).toBe(true)
})
