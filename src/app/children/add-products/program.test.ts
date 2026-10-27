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
import { datesOf, MAX_DIGITS } from '#libs/dates/digit-dates.ts'
import { messagesSentBy } from '#libs/tea-snabbdom/view.test_support.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import { digit, editing, message, state, submitting } from './program.test_arbitrary.ts'
import {
  type Command,
  type Digit,
  type Event,
  type Form,
  type Message,
  type Model,
  program,
  type State,
} from './program.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()
const Ev = Data.taggedEnum<Event>()

const { outcome, rejects, step } = outcomesOf(program.update)

const { makeModel } = program

const digits: ReadonlyArray<Digit> = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/** The same state, with its form changed. */
const withForm = (state: State, change: Partial<Form>): State => ({ ...state, form: { ...state.form, ...change } })

/** The days the page offers, by the rules of a product: those the digits name, from the clock's time on. */
const offeredDates = (form: Form) =>
  Opt.match(form.maybeNow, {
    onNone: () => [],
    onSome: (now) => datesOf(form.digits, now).filter(Product.canExpireOn(now)),
  })

/** The day the form names: the one picked, while the digits name it, or else the only one they name. */
const namedDate = (form: Form): Opt.Option<DateTime.Utc> => {
  const offered = offeredDates(form)
  const isOffered = (date: DateTime.Utc) => offered.some((d) => DateTime.Equivalence(d, date))
  return Opt.orElse(
    Opt.filter(form.maybeChosenDate, isOffered),
    () => offered.length === 1 ? Opt.fromNullishOr(offered[0]) : Opt.none(),
  )
}

/** The product the form describes: named, never expiring with no digits, or on the day they name. */
const productOf = (form: Form) =>
  Opt.flatMap(
    Opt.all([
      form.maybeName,
      form.maybeNow,
      form.digits === '' ? Opt.some(Opt.none<DateTime.Utc>()) : Opt.map(namedDate(form), Opt.some),
    ]),
    ([name, creationDate, maybeExpirationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
  )

/** A message that cannot arrive in that state: a completion while no product is being added. */
const cannotArrive = (msg: Message, before: State) => msg._tag === 'Completed' && before._tag !== 'Submitting'

describe('AddProducts update', () => {
  test('is total and deterministic, but for a message that cannot arrive', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(!cannotArrive(msg, before))
      return Equal.equals(outcome(msg, before), outcome(msg, before))
    })
  })

  // Each message the view sends is accepted in the state it was rendered from; sent twice from the same frame,
  // it acts once, but the keypad's keys, which are meant to repeat, and the close button, whose second press
  // the parent ignores once the page is gone. And what the user could ask for and `update` accepts is in the
  // view, but while the product is being added: the name's input and the close button are disabled then (the
  // platform's back button, still observed so that it does not leave the app, changes nothing).
  test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
    const check = dispatchViolations(program.update, {
      repeatable: (msg) => msg._tag === 'DigitTyped' || msg._tag === 'DigitErased' || msg._tag === 'BackPressed',
      withheld: (msg, state) =>
        (msg._tag === 'NameChanged' || msg._tag === 'BackPressed') && state._tag === 'Submitting',
    })
    fc.assert(fc.property(state, fc.string(), utc, (before, inputValue, date) => {
      const askable = [
        Msg.BackPressed(),
        Msg.NameChanged({ name: inputValue }),
        Msg.DigitErased(),
        ...digits.map((digit) => Msg.DigitTyped({ digit })),
        Msg.Started(),
        // The days the digits name, and any other.
        ...[date, ...offeredDates(before.form)].map((day) => Msg.DateChosen({ date: day })),
      ]
      expect(check(before, messagesSentBy<Model, Message>(view, makeModel(before), inputValue), askable)).toEqual([])
    }))
  })

  describe('NameChanged', () => {
    // While submitting the input is disabled, but a key typed just before must not be lost.
    test('stores what is typed, as typed, in any state', () => {
      assertProperty(
        [state, fc.string()],
        (before, name) =>
          Equal.equals(step(Msg.NameChanged({ name }), before).after, withForm(before, { maybeName: Opt.some(name) })),
      )
    })
  })

  describe('the keypad', () => {
    test('types a digit after the others, up to the longest date, and forgets the day picked', () => {
      assertProperty([editing, digit], (before, typed) =>
        before.form.digits.length >= MAX_DIGITS
          ? rejects(Msg.DigitTyped({ digit: typed }), before)
          : Equal.equals(
            step(Msg.DigitTyped({ digit: typed }), before).after,
            withForm(before, { digits: before.form.digits + typed, maybeChosenDate: Opt.none() }),
          ))
    })

    test('erases the last digit and forgets the day picked, or is rejected when there is no digit', () => {
      assertProperty([editing], (before) =>
        before.form.digits === ''
          ? rejects(Msg.DigitErased(), before)
          : Equal.equals(
            step(Msg.DigitErased(), before).after,
            withForm(before, { digits: before.form.digits.slice(0, -1), maybeChosenDate: Opt.none() }),
          ))
    })

    test('is rejected while a product is being added', () => {
      assertProperty(
        [submitting, digit],
        (before, typed) => rejects(Msg.DigitTyped({ digit: typed }), before) && rejects(Msg.DigitErased(), before),
      )
    })
  })

  test('TimeChanged keeps the time', () => {
    assertProperty(
      [state, utc],
      (before, now) =>
        Equal.equals(step(Msg.TimeChanged({ now }), before).after, withForm(before, { maybeNow: Opt.some(now) })),
    )
  })

  test('Scanned names the product after another barcode, and draws the name anew', () => {
    assertProperty([state, fc.string()], (before, barcode) => {
      const { after } = step(Msg.Scanned({ barcode }), before)
      return Opt.contains(before.form.maybeName, barcode)
        ? Equal.equals(after, before)
        : Equal.equals(after, withForm(before, { maybeName: Opt.some(barcode), scans: before.form.scans + 1 }))
    })
  })

  test('CameraFailed turns the camera off', () => {
    assertProperty(
      [state],
      (before) => Equal.equals(step(Msg.CameraFailed(), before).after, withForm(before, { isCameraOn: false })),
    )
  })

  describe('DateChosen', () => {
    test('picks a day the digits name, unless the form already names it, and is rejected on any other day', () => {
      assertProperty([editing, utc], (before, date) => {
        const offered = offeredDates(before.form)
        return [...offered, date].every((day) => {
          const msg = Msg.DateChosen({ date: day })
          const isOffered = offered.some((d) => DateTime.Equivalence(d, day))
          return isOffered && !Opt.contains(namedDate(before.form), day)
            ? Equal.equals(step(msg, before).after, withForm(before, { maybeChosenDate: Opt.some(day) }))
            : rejects(msg, before)
        })
      })
    })

    test('is rejected while a product is being added', () => {
      assertProperty([submitting, utc], (before, date) => rejects(Msg.DateChosen({ date }), before))
    })
  })

  describe('Started', () => {
    // The product is created at the time the page last heard: the rules of a product decide.
    test('adds the product the form describes, and is rejected while it describes none', () => {
      assertProperty([editing], (before) =>
        Opt.match(productOf(before.form), {
          onNone: () => rejects(Msg.Started(), before),
          onSome: (product) => {
            const { after, commands } = step(Msg.Started(), before)
            return Equal.equals(after, { _tag: 'Submitting', form: before.form, product })
              && Equal.equals(commands, [Cmd.Add({ product })])
          },
        }))
    })

    test('is rejected while a product is being added', () => {
      assertProperty([submitting], (before) => rejects(Msg.Started(), before))
    })
  })

  // Guards against the properties above passing only on rejections.
  test('the arbitrary forms describe a product at times, and at times not, with days picked and days to pick', () => {
    const models = fc.sample(editing, 1_000).map(makeModel)
    const choices = models.flatMap((model) =>
      model._tag === 'Editing' && model.date._tag === 'Naming' ? model.date.choices : []
    )
    expect(models.some((model) => model._tag === 'Editing' && Opt.isSome(model.maybeAdd))).toBe(true)
    expect(models.some((model) => model._tag === 'Editing' && Opt.isNone(model.maybeAdd))).toBe(true)
    expect(choices.some((choice) => choice.choice._tag === 'Chosen')).toBe(true)
    expect(choices.some((choice) => choice.choice._tag === 'Offered')).toBe(true)
  })

  // What the view draws of the date and the keypad is decided here, so that it is checked for any form.
  describe('the model', () => {
    test('says the date is undated, names the days the digits name, the one picked among them, or names nothing', () => {
      assertProperty([editing], (s) => {
        const model = makeModel(s)
        if (model._tag !== 'Editing') return false
        const offered = offeredDates(s.form)
        if (s.form.digits === '') return model.date._tag === 'Undated'
        if (offered.length === 0) return model.date._tag === 'NamingNothing'
        return model.date._tag === 'Naming'
          && Equal.equals(model.date.choices.map((choice) => choice.date), offered)
          && model.date.choices.every((choice) =>
            Equal.equals(
              choice.choice,
              Opt.contains(namedDate(s.form), choice.date)
                ? { _tag: 'Chosen' }
                : { _tag: 'Offered', choose: Msg.DateChosen({ date: choice.date }) },
            )
          )
      })
    })

    test('offers to add the product the form describes, while editing', () => {
      assertProperty([editing], (s) => {
        const model = makeModel(s)
        return model._tag === 'Editing'
          && Equal.equals(model.maybeAdd, Opt.map(productOf(s.form), () => Msg.Started()))
      })
    })

    test('the field is blank, the digits, or the day the form names', () => {
      assertProperty([state], (s) => {
        const expected = s.form.digits === ''
          ? { _tag: 'Blank' }
          : Opt.match(namedDate(s.form), {
            onNone: () => ({ _tag: 'Digits', digits: s.form.digits }),
            onSome: (date) => ({ _tag: 'Day', date }),
          })
        return Equal.equals(makeModel(s).field, expected)
      })
    })

    test('offers the keypad while editing: digits up to the longest date, erasing once there are any', () => {
      assertProperty([state, digit], (s, typed) => {
        const model = makeModel(s)
        const canType = s._tag === 'Editing' && s.form.digits.length < MAX_DIGITS
        const canErase = s._tag === 'Editing' && s.form.digits !== ''
        return Equal.equals(
          Opt.map(model.maybeTypeDigit, (type) => type(typed)),
          canType ? Opt.some(Msg.DigitTyped({ digit: typed })) : Opt.none(),
        )
          && Equal.equals(model.maybeEraseDigit, canErase ? Opt.some(Msg.DigitErased()) : Opt.none())
      })
    })
  })

  test('the model shows the product added last for 4 seconds from when it was added', () => {
    const seconds = fc.integer({ min: -10, max: 10 })
    assertProperty([state, seconds], (before, elapsed) =>
      Opt.match(before.form.maybeLastAdded, {
        onNone: () => true,
        onSome: (product) => {
          const now = DateTime.add(product.creationDate, { seconds: elapsed })
          const model = makeModel(withForm(before, { maybeNow: Opt.some(now) }))
          return Opt.isSome(model.maybeJustAdded) === elapsed < 4
        },
      }))
  })

  describe('Completed', () => {
    test('success keeps the page for the next product, with its name, no digits and no day picked', () => {
      assertProperty([submitting], (before) => {
        const { after, commands } = step(Msg.Completed({ succeeded: true }), before)
        return Equal.equals(after, {
          _tag: 'Editing',
          form: { ...before.form, digits: '', maybeChosenDate: Opt.none(), maybeLastAdded: Opt.some(before.product) },
        })
          && commands.length === 0
      })
    })

    test('failure gives the form back, as it was, and says so with a toast', () => {
      assertProperty([submitting], (before) => {
        const { after, commands } = step(Msg.Completed({ succeeded: false }), before)
        return Equal.equals(after, { _tag: 'Editing', form: before.form })
          && Equal.equals(commands, [Cmd.ShowToast({ text: 'Could not add the product' })])
      })
    })

    // Only a completion leaves Submitting, so one that arrives elsewhere is a bug.
    test('is a defect when no product is being added', () => {
      assertProperty([editing, fc.boolean()], (before, succeeded) => {
        expect(() => program.update(Msg.Completed({ succeeded }))(before)).toThrow()
        return true
      })
    })
  })

  test('BackPressed asks the parent to leave the page, but while a product is being added', () => {
    assertProperty([state], (before) => {
      const { after, commands, events } = step(Msg.BackPressed(), before)
      const expected = before._tag === 'Editing' ? [Ev.LeaveRequested()] : []
      return Equal.equals(after, before) && commands.length === 0 && Equal.equals(events, expected)
    })
  })
})

// The back button is observed in every state: while a product is being added, so that it does not leave the app.
test('the page listens to the clock and the back button, and to the camera until it fails', () => {
  assertProperty([state], (s) => {
    const subscriptions = Tea.subscriptionsOf(program)(s)
    return HashMap.has(subscriptions, 'clock')
      && HashMap.has(subscriptions, 'back-button')
      && HashMap.has(subscriptions, 'scanner') === s.form.isCameraOn
  })
})
