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
import { datesOf, MAX_DIGITS } from '#libs/dates/digit-dates.ts'
import { messagesSentBy } from '#libs/tea-snabbdom/view.test_support.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import { dating, digit, message, naming, scanning, state, submitting } from './program.test_arbitrary.ts'
import {
  type Command,
  type DateForm,
  type Digit,
  type Event,
  type Form,
  type Message,
  type Model,
  program,
  type State,
  type Step,
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

/** The second step, with its date changed. */
const withDate = (state: State & { _tag: 'Dating' }, change: Partial<DateForm>): State => ({
  ...state,
  date: { ...state.date, ...change },
})

/** The step a product is added from. */
const stepOf = (state: State & { _tag: 'Naming' | 'Dating' }): Step =>
  state._tag === 'Naming' ? { _tag: 'Naming' } : { _tag: 'Dating', date: state.date }

/** The step a product was added from, as it was. */
const resumed = (step: Step, form: Form): State =>
  step._tag === 'Naming' ? { _tag: 'Naming', form } : { _tag: 'Dating', form, date: step.date }

/**
 * The days the page offers, by the rules of a product: those the digits name, read in the order in use, from the
 * clock's time on.
 */
const offeredDates = (form: Form, date: DateForm) =>
  Opt.match(Opt.all([form.maybeNow, form.maybeOrder]), {
    onNone: () => [],
    onSome: ([now, order]) => datesOf(date.digits, now, order).filter(Product.canExpireOn(now)),
  })

/** The day the form names: the one picked, while the digits name it, or else the only one they name. */
const namedDate = (form: Form, date: DateForm): Opt.Option<DateTime.Utc> => {
  const offered = offeredDates(form, date)
  const isOffered = (day: DateTime.Utc) => offered.some((d) => DateTime.Equivalence(d, day))
  return Opt.orElse(
    Opt.filter(date.maybeChosenDate, isOffered),
    () => offered.length === 1 ? Opt.fromNullishOr(offered[0]) : Opt.none(),
  )
}

/** The product the name describes, created at the clock's time, with that expiration. */
const productOf = (form: Form, maybeExpirationDate: Opt.Option<DateTime.Utc>) =>
  Opt.flatMap(
    Opt.all([form.maybeName, form.maybeNow]),
    ([name, creationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
  )

/** The product a step describes: never expiring on the first, expiring on the day named on the second. */
const productOfStep = (state: State & { _tag: 'Naming' | 'Dating' }) =>
  state._tag === 'Naming'
    ? productOf(state.form, Opt.none())
    : Opt.flatMap(namedDate(state.form, state.date), (date) => productOf(state.form, Opt.some(date)))

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

/** Whether the step's own button would add the product added last again: the same name and expiration. */
const addsLastAgain = (s: State & { _tag: 'Naming' | 'Dating' }) =>
  Opt.exists(
    Opt.all([productOfStep(s), s.form.maybeLastAdded]),
    ([product, last]) =>
      product.name === last.name
      && Opt.makeEquivalence(DateTime.Equivalence)(product.maybeExpirationDate, last.maybeExpirationDate),
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

const onAStep = fc.oneof(naming, dating)

const offAnyStep = fc.oneof(scanning, submitting)

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
  // it acts once, but the keypad's digit keys, which are meant to repeat, and the close button, whose second
  // press the parent ignores once the page is gone. And what the user could ask for and `update` accepts is in
  // the view, but the name's input off the first step, where it is covered or disabled, and the snackbar's
  // action where the step's own button would add the same product.
  test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
    const check = dispatchViolations(program.update, {
      repeatable: (msg) => msg._tag === 'DigitTyped' || msg._tag === 'DigitErased' || msg._tag === 'Closed',
      withheld: (msg, state) =>
        (msg._tag === 'NameChanged' && state._tag !== 'Naming')
        || (msg._tag === 'Repeated' && (state._tag === 'Naming' || state._tag === 'Dating') && addsLastAgain(state)),
    })
    fc.assert(fc.property(state, fc.string(), utc, (before, inputValue, date) => {
      const offered = before._tag === 'Dating' ? offeredDates(before.form, before.date) : []
      const askable = [
        Msg.NameChanged({ name: inputValue }),
        Msg.NameCleared(),
        Msg.ScanRequested(),
        Msg.ScanClosed(),
        Msg.DateRequested(),
        Msg.DateDismissed(),
        Msg.Closed(),
        Msg.Repeated(),
        Msg.DigitErased(),
        Msg.DateCleared(),
        ...digits.map((digit) => Msg.DigitTyped({ digit })),
        Msg.Started(),
        // The days the digits name, and any other.
        ...[date, ...offered].map((day) => Msg.DateChosen({ date: day })),
        ...DateOrder.all.map((order) => Msg.OrderPicked({ order })),
      ]
      expect(check(before, messagesSentBy<Model, Message>(view, makeModel(before), inputValue), askable)).toEqual([])
    }))
  })

  describe('NameChanged', () => {
    // Off the first step the input is covered or disabled, but a key typed just before must not be lost.
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
        before._tag === 'Naming' && Opt.exists(before.form.maybeName, (name) => name !== '')
          ? Equal.equals(step(Msg.NameCleared(), before), {
            rejected: false,
            after: withForm(before, { maybeName: Opt.none(), replacements: before.form.replacements + 1 }),
            commands: [],
            events: [],
          })
          : rejects(Msg.NameCleared(), before),
    )
  })

  test('ScanRequested opens the scanner once the device can read barcodes, on the first step', () => {
    assertProperty([state], (before) =>
      before._tag === 'Naming' && before.form.camera === 'Available'
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
          after: { _tag: 'Naming', form: before.form },
          commands: [],
          events: [],
        })
        : rejects(Msg.ScanClosed(), before))
  })

  test('Scanned names the product and closes the scanner, on the first step', () => {
    assertProperty([scanning, fc.oneof(fc.string(), fc.constant('4006381333931'))], (before, barcode) => {
      fc.pre(readsCamera(before))
      const form = Opt.contains(before.form.maybeName, barcode)
        ? before.form
        : { ...before.form, maybeName: Opt.some(barcode), replacements: before.form.replacements + 1 }
      return Equal.equals(step(Msg.Scanned({ barcode }), before), {
        rejected: false,
        after: { _tag: 'Naming', form },
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

  // The date is the product's: only a name that is one goes on to it.
  test('DateRequested goes on to the date, with no digit, while the name is a product\'s, on the first step', () => {
    assertProperty([state], (before) =>
      before._tag === 'Naming' && Opt.isSome(productOf(before.form, Opt.none()))
        ? Equal.equals(step(Msg.DateRequested(), before), {
          rejected: false,
          after: { _tag: 'Dating', form: before.form, date: { digits: '', maybeChosenDate: Opt.none() } },
          commands: [],
          events: [],
        })
        : rejects(Msg.DateRequested(), before))
  })

  test('DateDismissed goes back to the name, the date forgotten, and is rejected off the second step', () => {
    assertProperty([state], (before) =>
      before._tag === 'Dating'
        ? Equal.equals(step(Msg.DateDismissed(), before), {
          rejected: false,
          after: { _tag: 'Naming', form: before.form },
          commands: [],
          events: [],
        })
        : rejects(Msg.DateDismissed(), before))
  })

  describe('the keypad', () => {
    test('types a digit after the others, up to the longest date, and forgets the day picked', () => {
      assertProperty([dating, digit], (before, typed) =>
        before.date.digits.length >= MAX_DIGITS
          ? rejects(Msg.DigitTyped({ digit: typed }), before)
          : Equal.equals(
            step(Msg.DigitTyped({ digit: typed }), before).after,
            withDate(before, { digits: before.date.digits + typed, maybeChosenDate: Opt.none() }),
          ))
    })

    test('erases the last digit and forgets the day picked, or is rejected when there is no digit', () => {
      assertProperty([dating], (before) =>
        before.date.digits === ''
          ? rejects(Msg.DigitErased(), before)
          : Equal.equals(
            step(Msg.DigitErased(), before).after,
            withDate(before, { digits: before.date.digits.slice(0, -1), maybeChosenDate: Opt.none() }),
          ))
    })

    test('clears every digit and forgets the day picked, or is rejected when there is no digit', () => {
      assertProperty([dating], (before) =>
        before.date.digits === ''
          ? rejects(Msg.DateCleared(), before)
          : Equal.equals(
            step(Msg.DateCleared(), before).after,
            withDate(before, { digits: '', maybeChosenDate: Opt.none() }),
          ))
    })

    test('is rejected off the second step', () => {
      assertProperty(
        [fc.oneof(naming, scanning, submitting), digit],
        (before, typed) =>
          rejects(Msg.DigitTyped({ digit: typed }), before) && rejects(Msg.DigitErased(), before)
          && rejects(Msg.DateCleared(), before),
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

  // The pick applies at once, and is kept in the setting, which reports it back.
  test('OrderPicked takes another order than the one in use and keeps it, on the second step, and is rejected otherwise', () => {
    assertProperty(
      [state, order],
      (before, picked) =>
        before._tag === 'Dating' && Opt.isSome(before.form.maybeOrder) && !Opt.contains(before.form.maybeOrder, picked)
          ? Equal.equals(step(Msg.OrderPicked({ order: picked }), before), {
            rejected: false,
            after: withForm(before, { maybeOrder: Opt.some(picked) }),
            commands: [Cmd.KeepOrder({ order: picked })],
            events: [],
          })
          : rejects(Msg.OrderPicked({ order: picked }), before),
    )
  })

  test('OrderChanged keeps the order, in any state', () => {
    assertProperty(
      [state, order],
      (before, order) =>
        Equal.equals(
          step(Msg.OrderChanged({ order }), before).after,
          withForm(before, { maybeOrder: Opt.some(order) }),
        ),
    )
  })

  test('OrderKept changes nothing, and says so with a toast when the order could not be kept', () => {
    assertProperty([state, fc.boolean()], (before, succeeded) => {
      const { after, commands } = step(Msg.OrderKept({ succeeded }), before)
      return Equal.equals(after, before)
        && Equal.equals(commands, succeeded ? [] : [Cmd.ShowToast({ text: 'Could not keep the date format' })])
    })
  })

  describe('DateChosen', () => {
    test('picks a day the digits name, unless the form already names it, and is rejected on any other day', () => {
      assertProperty([dating, utc], (before, date) => {
        const offered = offeredDates(before.form, before.date)
        return [...offered, date].every((day) => {
          const msg = Msg.DateChosen({ date: day })
          const isOffered = offered.some((d) => DateTime.Equivalence(d, day))
          return isOffered && !Opt.contains(namedDate(before.form, before.date), day)
            ? Equal.equals(step(msg, before).after, withDate(before, { maybeChosenDate: Opt.some(day) }))
            : rejects(msg, before)
        })
      })
    })

    test('is rejected off the second step', () => {
      assertProperty(
        [fc.oneof(naming, scanning, submitting), utc],
        (before, date) => rejects(Msg.DateChosen({ date }), before),
      )
    })
  })

  describe('Started', () => {
    // The product is created at the time the page last heard: the rules of a product decide.
    test('adds the product the step describes, never expiring from the first, and is rejected while it describes none', () => {
      assertProperty([onAStep], (before) =>
        Opt.match(productOfStep(before), {
          onNone: () => rejects(Msg.Started(), before),
          onSome: (product) => {
            const { after, commands } = step(Msg.Started(), before)
            return Equal.equals(after, {
              _tag: 'Submitting',
              form: before.form,
              product,
              step: stepOf(before),
              from: 'Form',
            })
              && Equal.equals(commands, [Cmd.Add({ product })])
              && (before._tag === 'Naming') === Opt.isNone(product.maybeExpirationDate)
          },
        }))
    })

    test('is rejected under the scanner and while a product is being added', () => {
      assertProperty([offAnyStep], (before) => rejects(Msg.Started(), before))
    })
  })

  test('Repeated adds the last product again while its snackbar shows, created now, from either step', () => {
    assertProperty([state], (before) => {
      const maybeRepeat = before._tag === 'Naming' || before._tag === 'Dating' ? repeatOf(before.form) : Opt.none()
      return Opt.match(maybeRepeat, {
        onNone: () => rejects(Msg.Repeated(), before),
        onSome: (product) => {
          if (before._tag !== 'Naming' && before._tag !== 'Dating') return false
          const { after, commands, events } = step(Msg.Repeated(), before)
          return Equal.equals(after, {
            _tag: 'Submitting',
            form: before.form,
            product,
            step: stepOf(before),
            from: 'Snackbar',
          })
            && Equal.equals(commands, [Cmd.Add({ product })])
            && events.length === 0
        },
      })
    })
  })

  // Guards against the properties above passing only on rejections.
  test('the arbitrary steps describe a product at times, and at times not, with days to pick and repeats', () => {
    const namings = fc.sample(naming, 1_000).map(makeModel)
    const datings = fc.sample(dating, 1_000).map(makeModel)
    const choices = datings.flatMap((model) =>
      model._tag === 'Dating' && model.strip._tag === 'Naming' ? model.strip.choices : []
    )
    const repeats = namings.flatMap((model) =>
      model._tag === 'Naming' ? Opt.toArray(model.maybeJustAdded).map(({ maybeRepeat }) => maybeRepeat) : []
    )
    expect(namings.some((model) => model._tag === 'Naming' && Opt.isSome(model.maybeAdd))).toBe(true)
    expect(namings.some((model) => model._tag === 'Naming' && Opt.isNone(model.maybeAdd))).toBe(true)
    expect(datings.some((model) => model._tag === 'Dating' && Opt.isSome(model.maybeAdd))).toBe(true)
    expect(datings.some((model) => model._tag === 'Dating' && Opt.isNone(model.maybeAdd))).toBe(true)
    const orders = datings.flatMap((model) =>
      model._tag === 'Dating' && model.order._tag === 'Known' ? model.order.choices : []
    )
    expect(choices.some((choice) => choice.choice._tag === 'Chosen')).toBe(true)
    expect(choices.some((choice) => choice.choice._tag === 'Offered')).toBe(true)
    expect(datings.some((model) => model._tag === 'Dating' && model.order._tag === 'Unknown')).toBe(true)
    expect(orders.some((choice) => choice.choice._tag === 'Current')).toBe(true)
    expect(orders.some((choice) => choice.choice._tag === 'Offered')).toBe(true)
    expect(repeats.some(Opt.isSome)).toBe(true)
    expect(namings.some((model) => model._tag === 'Naming' && Opt.isNone(model.maybeJustAdded))).toBe(true)
    expect(namings.some((model) =>
      model._tag === 'Naming' && Opt.isSome(model.maybeAdd)
      && Opt.exists(model.maybeJustAdded, ({ maybeRepeat }) => Opt.isNone(maybeRepeat))
    )).toBe(true)
  })

  // What the view draws is decided here, so that it is checked for any state.
  describe('the model', () => {
    test('offers both ways out of the first step exactly while the name is a product\'s', () => {
      assertProperty([naming], (s) => {
        const model = makeModel(s)
        const maybeProduct = productOf(s.form, Opt.none())
        return model._tag === 'Naming'
          && Equal.equals(model.maybeRequestDate, Opt.map(maybeProduct, () => Msg.DateRequested()))
          && Equal.equals(model.maybeAdd, Opt.map(maybeProduct, () => Msg.Started()))
      })
    })

    test('offers to add the product on the second step exactly while the digits name its day', () => {
      assertProperty([dating], (s) => {
        const model = makeModel(s)
        return model._tag === 'Dating'
          && Equal.equals(model.maybeAdd, Opt.map(productOfStep(s), () => Msg.Started()))
      })
    })

    test('offers the scanner once the device can read barcodes', () => {
      assertProperty([naming], (s) => {
        const model = makeModel(s)
        return model._tag === 'Naming'
          && Equal.equals(model.maybeScan, s.form.camera === 'Available' ? Opt.some(Msg.ScanRequested()) : Opt.none())
      })
    })

    // After a product added as it is, the name stays: "Add without expiration" adds it again, so the snackbar's
    // action would do the same; so would the second step's button, while its digits name the last product's day.
    test('offers to add the last product again exactly while update accepts it and the button of the step would not add it, on either step', () => {
      assertProperty([onAStep], (s) => {
        const model = makeModel(s)
        if (model._tag !== 'Naming' && model._tag !== 'Dating') return false
        const maybeRepeat = Opt.flatMap(model.maybeJustAdded, ({ maybeRepeat }) => maybeRepeat)
        return Equal.equals(
          maybeRepeat,
          rejects(Msg.Repeated(), s) || addsLastAgain(s) ? Opt.none() : Opt.some(Msg.Repeated()),
        )
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
            const shown = model._tag === 'Naming' || model._tag === 'Dating'
              ? Opt.map(model.maybeJustAdded, (justAdded) => justAdded.product)
              : model._tag === 'Adding'
              ? model.maybeJustAdded
              : Opt.none()
            return Equal.equals(shown, before._tag !== 'Scanning' && elapsed < 6 ? Opt.some(product) : Opt.none())
          },
        }))
    })

    test('the first step shows the name, drawn anew with each replacement, and the camera, in every state', () => {
      assertProperty([state], (s) => {
        const model = makeModel(s)
        return model.name === Opt.getOrElse(s.form.maybeName, () => '')
          && model.nameKey === s.form.replacements
          && model.camera === s.form.camera
      })
    })

    // The days can be picked only while the step takes them: not while the product is being added.
    test('the date field shows the digits as typed; the strip the hint, the days they name in the order in use with the one picked, or that they name none', () => {
      assertProperty([fc.oneof(dating, submitting)], (s) => {
        const maybeDate = s._tag === 'Dating'
          ? Opt.some(s.date)
          : s.step._tag === 'Dating'
          ? Opt.some(s.step.date)
          : Opt.none()
        const model = makeModel(s)
        const shown = model._tag === 'Dating'
          ? Opt.some(model)
          : model._tag === 'Adding' && model.step._tag === 'Dating'
          ? Opt.some(model.step)
          : Opt.none()
        return Opt.match(maybeDate, {
          onNone: () => Opt.isNone(shown),
          onSome: (date) => {
            const offered = offeredDates(s.form, date)
            const expected = date.digits === ''
              ? { _tag: 'Hint' }
              : offered.length === 0
              ? { _tag: 'NamingNothing' }
              : {
                _tag: 'Naming',
                choices: offered.map((day) => ({
                  date: day,
                  choice: Opt.contains(namedDate(s.form, date), day)
                    ? { _tag: 'Chosen' }
                    : {
                      _tag: 'Offered',
                      maybeChoose: s._tag === 'Dating' ? Opt.some(Msg.DateChosen({ date: day })) : Opt.none(),
                    },
                })),
              }
            return Opt.exists(
              shown,
              (field) =>
                field.digits === date.digits && Equal.equals(field.strip, expected)
                && field.name === Opt.getOrElse(s.form.maybeName, () => ''),
            )
          },
        })
      })
    })

    // The orders can be picked only while the step takes them: not while the product is being added.
    test('the second step shows the order in use with the others to pick, once known, exactly while update accepts them', () => {
      assertProperty([fc.oneof(dating, submitting)], (s) => {
        const model = makeModel(s)
        const shown = model._tag === 'Dating'
          ? Opt.some(model.order)
          : model._tag === 'Adding' && model.step._tag === 'Dating'
          ? Opt.some(model.step.order)
          : Opt.none()
        const expected = Opt.match(s.form.maybeOrder, {
          onNone: () => ({ _tag: 'Unknown' }),
          onSome: (current) => ({
            _tag: 'Known',
            order: current,
            choices: DateOrder.all.map((order) => ({
              order,
              choice: order === current
                ? { _tag: 'Current' }
                : {
                  _tag: 'Offered',
                  maybePick: rejects(Msg.OrderPicked({ order }), s) ? Opt.none() : Opt.some(Msg.OrderPicked({ order })),
                },
            })),
          }),
        })
        return (s._tag === 'Dating' || s.step._tag === 'Dating') === Opt.isSome(shown)
          && Opt.match(shown, { onNone: () => true, onSome: (order) => Equal.equals(order, expected) })
      })
    })

    test('offers to clear the name exactly while update accepts it', () => {
      assertProperty([naming], (s) => {
        const model = makeModel(s)
        return model._tag === 'Naming'
          && Equal.equals(
            model.maybeClearName,
            rejects(Msg.NameCleared(), s) ? Opt.none() : Opt.some(Msg.NameCleared()),
          )
      })
    })

    test('offers the keypad on the second step: digits up to the longest date, erasing and clearing once there are any', () => {
      assertProperty([dating, digit], (s, typed) => {
        const model = makeModel(s)
        if (model._tag !== 'Dating') return false
        const canType = s.date.digits.length < MAX_DIGITS
        const hasDigits = s.date.digits !== ''
        return Equal.equals(
          Opt.map(model.maybeTypeDigit, (type) => type(typed)),
          canType ? Opt.some(Msg.DigitTyped({ digit: typed })) : Opt.none(),
        )
          && Equal.equals(model.maybeEraseDigit, hasDigits ? Opt.some(Msg.DigitErased()) : Opt.none())
          && Equal.equals(model.maybeClearDate, hasDigits ? Opt.some(Msg.DateCleared()) : Opt.none())
      })
    })
  })

  describe('Completed', () => {
    test('success after a step\'s product starts the next one at the name, this one\'s kept and drawn anew', () => {
      assertProperty([submitting], (before) => {
        fc.pre(before.from === 'Form')
        const { after, commands } = step(Msg.Completed({ succeeded: true }), before)
        return Equal.equals(after, {
          _tag: 'Naming',
          form: {
            ...before.form,
            maybeLastAdded: Opt.some(before.product),
            replacements: before.form.replacements + 1,
          },
        })
          && commands.length === 0
      })
    })

    // The digits typed while the snackbar's product was being added are the next product's.
    test('success after the snackbar keeps the step as it is', () => {
      assertProperty([submitting], (before) => {
        fc.pre(before.from === 'Snackbar')
        const { after, commands } = step(Msg.Completed({ succeeded: true }), before)
        return Equal.equals(after, resumed(before.step, { ...before.form, maybeLastAdded: Opt.some(before.product) }))
          && commands.length === 0
      })
    })

    test('failure gives the step back, as it was, and says so with a toast', () => {
      assertProperty([submitting], (before) => {
        const { after, commands } = step(Msg.Completed({ succeeded: false }), before)
        return Equal.equals(after, resumed(before.step, before.form))
          && Equal.equals(commands, [Cmd.ShowToast({ text: 'Could not add the product' })])
      })
    })
  })

  test('Closed asks the parent to leave the page on the first step, and is rejected otherwise', () => {
    assertProperty([state], (before) => {
      if (before._tag !== 'Naming') return rejects(Msg.Closed(), before)
      const { after, commands, events } = step(Msg.Closed(), before)
      return Equal.equals(after, before) && commands.length === 0 && Equal.equals(events, [Ev.LeaveRequested()])
    })
  })

  test('BackPressed leaves the page, closes the scanner or the second step first, and is held while adding', () => {
    assertProperty([state], (before) => {
      const { after, commands, events } = step(Msg.BackPressed(), before)
      const expected = before._tag === 'Naming'
        ? { after: before, events: [Ev.LeaveRequested()] }
        : before._tag === 'Scanning' || before._tag === 'Dating'
        ? { after: { _tag: 'Naming', form: before.form }, events: [] }
        : { after: before, events: [] }
      return Equal.equals(after, expected.after) && commands.length === 0 && Equal.equals(events, expected.events)
    })
  })
})

// The back button is observed in every state: while a product is being added, so that it does not leave the app.
test('the page listens to the clock, the date order and the back button, and to the camera while the scanner is open until it fails', () => {
  assertProperty([state], (s) => {
    const subscriptions = Tea.subscriptionsOf(program)(s)
    return HashMap.has(subscriptions, 'clock')
      && HashMap.has(subscriptions, 'date-order')
      && HashMap.has(subscriptions, 'back-button')
      && HashMap.has(subscriptions, 'scanner') === readsCamera(s)
  })
})
