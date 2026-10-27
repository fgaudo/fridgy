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
import { digit, editing, message, scanning, state, submitting } from './program.test_arbitrary.ts'
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

/** The product added last, while less than 6 seconds have passed since it was. */
const justAdded = (form: Form) =>
  Opt.filter(
    form.maybeLastAdded,
    (product) =>
      Opt.exists(form.maybeNow, (now) => DateTime.isLessThan(now, DateTime.add(product.creationDate, { seconds: 6 }))),
  )

/** The product added last, again, created at the clock's time, while its snackbar shows. */
const repeatOf = (form: Form) =>
  Opt.flatMap(
    Opt.all([justAdded(form), form.maybeNow]),
    ([{ name, maybeExpirationDate }, creationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
  )

/** Whether the page reads the camera: while the scanner is open, until it fails. */
const readsCamera = (state: State) => state._tag === 'Scanning' && state.form.camera === 'Available'

/**
 * A message that cannot arrive in that state: a completion while no product is being added, or the camera's while
 * the page does not read it.
 */
const cannotArrive = (msg: Message, before: State) =>
  (msg._tag === 'Completed' && before._tag !== 'Submitting')
  || ((msg._tag === 'Scanned' || msg._tag === 'CameraFailed') && !readsCamera(before))

describe('AddProducts update', () => {
  test('is total and deterministic, but for a message that cannot arrive', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(!cannotArrive(msg, before))
      return Equal.equals(outcome(msg, before), outcome(msg, before))
    })
  })

  test('a message that cannot arrive is a defect', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(cannotArrive(msg, before))
      expect(() => program.update(msg)(before)).toThrow()
      return true
    })
  })

  // Each message the view sends is accepted in the state it was rendered from; sent twice from the same frame,
  // it acts once, but the keypad's keys, which are meant to repeat, and the close button, whose second press the
  // parent ignores once the page is gone. And what the user could ask for and `update` accepts is in the view, but
  // the name's input under the scanner and while a product is being added, where it is covered or disabled.
  test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
    const check = dispatchViolations(program.update, {
      repeatable: (msg) => msg._tag === 'DigitTyped' || msg._tag === 'DigitErased' || msg._tag === 'Closed',
      withheld: (msg, state) => msg._tag === 'NameChanged' && state._tag !== 'Editing',
    })
    fc.assert(fc.property(state, fc.string(), utc, (before, inputValue, date) => {
      const askable = [
        Msg.NameChanged({ name: inputValue }),
        Msg.NameCleared(),
        Msg.ScanRequested(),
        Msg.ScanClosed(),
        Msg.Closed(),
        Msg.Repeated(),
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
    // Under the scanner and while submitting the input is covered or disabled, but a key typed just before must
    // not be lost.
    test('stores what is typed, as typed, in any state', () => {
      assertProperty(
        [state, fc.string()],
        (before, name) =>
          Equal.equals(step(Msg.NameChanged({ name }), before).after, withForm(before, { maybeName: Opt.some(name) })),
      )
    })
  })

  test('NameCleared empties the name, drawing the input anew, and is rejected with no name to clear', () => {
    assertProperty(
      [state],
      (before) =>
        before._tag === 'Editing' && Opt.exists(before.form.maybeName, (name) => name !== '')
          ? Equal.equals(step(Msg.NameCleared(), before), {
            rejected: false,
            after: withForm(before, { maybeName: Opt.none(), replacements: before.form.replacements + 1 }),
            commands: [],
            events: [],
          })
          : rejects(Msg.NameCleared(), before),
    )
  })

  test('ScanRequested opens the scanner once the device can read barcodes', () => {
    assertProperty([state], (before) =>
      before._tag === 'Editing' && before.form.camera === 'Available'
        ? Equal.equals(step(Msg.ScanRequested(), before), {
          rejected: false,
          after: { _tag: 'Scanning', form: before.form },
          commands: [],
          events: [],
        })
        : rejects(Msg.ScanRequested(), before))
  })

  test('ScanClosed closes the scanner with the form kept', () => {
    assertProperty([state], (before) =>
      before._tag === 'Scanning'
        ? Equal.equals(step(Msg.ScanClosed(), before), {
          rejected: false,
          after: { _tag: 'Editing', form: before.form },
          commands: [],
          events: [],
        })
        : rejects(Msg.ScanClosed(), before))
  })

  test('Scanned names the product and closes the scanner, clearing the date for another product', () => {
    assertProperty([scanning, fc.oneof(fc.string(), fc.constant('4006381333931'))], (before, barcode) => {
      fc.pre(readsCamera(before))
      const form = Opt.contains(before.form.maybeName, barcode)
        ? before.form
        : {
          ...before.form,
          maybeName: Opt.some(barcode),
          replacements: before.form.replacements + 1,
          digits: '',
          maybeChosenDate: Opt.none(),
        }
      return Equal.equals(step(Msg.Scanned({ barcode }), before), {
        rejected: false,
        after: { _tag: 'Editing', form },
        commands: [],
        events: [],
      })
    })
  })

  // The scanner stays open, saying so, until the user closes it.
  test('CameraFailed makes the camera unavailable', () => {
    assertProperty([scanning], (before) => {
      fc.pre(readsCamera(before))
      return Equal.equals(step(Msg.CameraFailed(), before).after, withForm(before, { camera: 'Unavailable' }))
    })
  })

  // The page opened, left and opened again before its check answered gets two answers: the second is late.
  test('CameraChecked says whether the device can read barcodes, in any state, and is rejected once it is known', () => {
    assertProperty([state, fc.boolean()], (before, isAvailable) =>
      before.form.camera === 'Checking'
        ? Equal.equals(step(Msg.CameraChecked({ isAvailable }), before), {
          rejected: false,
          after: withForm(before, { camera: isAvailable ? 'Available' : 'Unavailable' }),
          commands: [],
          events: [],
        })
        : rejects(Msg.CameraChecked({ isAvailable }), before))
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

    test('is rejected under the scanner and while a product is being added', () => {
      assertProperty(
        [fc.oneof(scanning, submitting), digit],
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

    test('is rejected under the scanner and while a product is being added', () => {
      assertProperty([fc.oneof(scanning, submitting), utc], (before, date) => rejects(Msg.DateChosen({ date }), before))
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
            return Equal.equals(after, { _tag: 'Submitting', form: before.form, product, from: 'Form' })
              && Equal.equals(commands, [Cmd.Add({ product })])
          },
        }))
    })

    test('is rejected under the scanner and while a product is being added', () => {
      assertProperty([fc.oneof(scanning, submitting)], (before) => rejects(Msg.Started(), before))
    })
  })

  test('Repeated adds the last product again while its snackbar shows, created now', () => {
    assertProperty([state], (before) => {
      const maybeRepeat = before._tag === 'Editing' ? repeatOf(before.form) : Opt.none()
      return Opt.match(maybeRepeat, {
        onNone: () => rejects(Msg.Repeated(), before),
        onSome: (product) => {
          const { after, commands, events } = step(Msg.Repeated(), before)
          return Equal.equals(after, { _tag: 'Submitting', form: before.form, product, from: 'Snackbar' })
            && Equal.equals(commands, [Cmd.Add({ product })])
            && events.length === 0
        },
      })
    })
  })

  // Guards against the properties above passing only on rejections.
  test('the arbitrary forms describe a product at times, and at times not, with days to pick and repeats', () => {
    const models = fc.sample(editing, 1_000).map(makeModel)
    const choices = models.flatMap((model) =>
      model._tag === 'Editing' && model.date._tag === 'Naming' ? model.date.choices : []
    )
    const repeats = models.flatMap((model) =>
      model._tag === 'Editing' ? Opt.toArray(model.maybeJustAdded).map(({ maybeRepeat }) => maybeRepeat) : []
    )
    expect(models.some((model) => model._tag === 'Editing' && Opt.isSome(model.maybeAdd))).toBe(true)
    expect(models.some((model) => model._tag === 'Editing' && Opt.isNone(model.maybeAdd))).toBe(true)
    expect(choices.some((choice) => choice.choice._tag === 'Chosen')).toBe(true)
    expect(choices.some((choice) => choice.choice._tag === 'Offered')).toBe(true)
    expect(repeats.some(Opt.isSome)).toBe(true)
    expect(models.some((model) => model._tag === 'Editing' && Opt.isNone(model.maybeJustAdded))).toBe(true)
  })

  // What the view draws is decided here, so that it is checked for any state.
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

    test('offers the scanner once the device can read barcodes', () => {
      assertProperty([editing], (s) => {
        const model = makeModel(s)
        return model._tag === 'Editing'
          && Equal.equals(model.maybeScan, s.form.camera === 'Available' ? Opt.some(Msg.ScanRequested()) : Opt.none())
      })
    })

    test('offers to add the last product again exactly while update accepts it', () => {
      assertProperty([editing], (s) => {
        const model = makeModel(s)
        if (model._tag !== 'Editing') return false
        const maybeRepeat = Opt.flatMap(model.maybeJustAdded, ({ maybeRepeat }) => maybeRepeat)
        return Equal.equals(maybeRepeat, rejects(Msg.Repeated(), s) ? Opt.none() : Opt.some(Msg.Repeated()))
      })
    })

    test('shows the snackbar for 6 seconds from when the product was added, but under the scanner', () => {
      const seconds = fc.integer({ min: -10, max: 10 })
      assertProperty([state, seconds], (before, elapsed) =>
        Opt.match(before.form.maybeLastAdded, {
          onNone: () => true,
          onSome: (product) => {
            const model = makeModel(
              withForm(before, { maybeNow: Opt.some(DateTime.add(product.creationDate, { seconds: elapsed })) }),
            )
            const shown = model._tag === 'Editing'
              ? Opt.map(model.maybeJustAdded, (justAdded) => justAdded.product)
              : model._tag === 'Submitting'
              ? model.maybeJustAdded
              : Opt.none()
            return Equal.equals(shown, before._tag !== 'Scanning' && elapsed < 6 ? Opt.some(product) : Opt.none())
          },
        }))
    })

    test('the field shows the digits as typed; the support the hint, the day the form names, or that it names none', () => {
      assertProperty([state], (s) => {
        const expected = s.form.digits === ''
          ? { _tag: 'Hint' }
          : Opt.match(namedDate(s.form), {
            onSome: (date) => ({ _tag: 'Named', date }),
            onNone: () => offeredDates(s.form).length > 0 ? { _tag: 'Hint' } : { _tag: 'NamingNothing' },
          })
        const model = makeModel(s)
        return model.digits === s.form.digits && Equal.equals(model.support, expected)
      })
    })

    test('offers to clear the name exactly while update accepts it', () => {
      assertProperty([editing], (s) => {
        const model = makeModel(s)
        return model._tag === 'Editing'
          && Equal.equals(
            model.maybeClearName,
            rejects(Msg.NameCleared(), s) ? Opt.none() : Opt.some(Msg.NameCleared()),
          )
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

  describe('Completed', () => {
    test('success after the form keeps the page for the next product, with its name, no digits and no day picked', () => {
      assertProperty([submitting], (before) => {
        fc.pre(before.from === 'Form')
        const { after, commands } = step(Msg.Completed({ succeeded: true }), before)
        return Equal.equals(after, {
          _tag: 'Editing',
          form: { ...before.form, digits: '', maybeChosenDate: Opt.none(), maybeLastAdded: Opt.some(before.product) },
        })
          && commands.length === 0
      })
    })

    // The digits typed while the snackbar's product was being added are the next product's.
    test('success after the snackbar keeps the form as it is', () => {
      assertProperty([submitting], (before) => {
        fc.pre(before.from === 'Snackbar')
        const { after, commands } = step(Msg.Completed({ succeeded: true }), before)
        return Equal.equals(after, {
          _tag: 'Editing',
          form: { ...before.form, maybeLastAdded: Opt.some(before.product) },
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
  })

  test('Closed asks the parent to leave the page while editing, and is rejected otherwise', () => {
    assertProperty([state], (before) => {
      if (before._tag !== 'Editing') return rejects(Msg.Closed(), before)
      const { after, commands, events } = step(Msg.Closed(), before)
      return Equal.equals(after, before) && commands.length === 0 && Equal.equals(events, [Ev.LeaveRequested()])
    })
  })

  test('BackPressed leaves the page, closes the scanner first, and is held while adding', () => {
    assertProperty([state], (before) => {
      const { after, commands, events } = step(Msg.BackPressed(), before)
      const expected = before._tag === 'Editing'
        ? { after: before, events: [Ev.LeaveRequested()] }
        : before._tag === 'Scanning'
        ? { after: { _tag: 'Editing', form: before.form }, events: [] }
        : { after: before, events: [] }
      return Equal.equals(after, expected.after) && commands.length === 0 && Equal.equals(events, expected.events)
    })
  })
})

// The back button is observed in every state: while a product is being added, so that it does not leave the app.
test('the page listens to the clock and the back button, and to the camera while the scanner is open until it fails', () => {
  assertProperty([state], (s) => {
    const subscriptions = Tea.subscriptionsOf(program)(s)
    return HashMap.has(subscriptions, 'clock')
      && HashMap.has(subscriptions, 'back-button')
      && HashMap.has(subscriptions, 'scanner') === readsCamera(s)
  })
})
