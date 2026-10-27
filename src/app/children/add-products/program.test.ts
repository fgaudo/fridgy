import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as References from 'effect/References'
import * as fc from 'fast-check'
import * as Product from '#domain/product.ts'
import { arbitrary as order } from '#libs/dates/date-order.test_arbitrary.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import { datesOf, MAX_DIGITS } from '#libs/dates/digit-dates.ts'
import { messagesSentBy } from '#libs/tea-snabbdom/view.test_support.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import {
  barcode,
  dating,
  digit,
  lookingUp,
  message,
  naming,
  scanning,
  state,
  submitting,
} from './program.test_arbitrary.ts'
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
import { type FoundProduct, ProductLookup, ProductLookupError } from './services/product-lookup/product-lookup.ts'
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

/** Whether the page looks `barcode` up. */
const looksUp = (state: State, barcode: string) => state._tag === 'LookingUp' && state.barcode === barcode

/**
 * A message that cannot arrive in that state: a completion while no product is being added, the camera's while
 * the page does not read it, or a lookup's answer for a barcode it does not look up.
 */
const cannotArrive = (msg: Message, before: State) =>
  (msg._tag === 'Completed' && before._tag !== 'Submitting')
  || ((msg._tag === 'Scanned' || msg._tag === 'CameraFailed') && !readsCamera(before))
  || (msg._tag === 'LookedUp' && !looksUp(before, msg.barcode))

const onAStep = fc.oneof(naming, dating)

const offAnyStep = fc.oneof(lookingUp, scanning, submitting)

const offTheDate = fc.oneof(naming, lookingUp, scanning, submitting)

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
        Msg.LookupCancelled(),
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
    // Off the first step the input is covered or disabled, but a key typed just before must not be lost. The name
    // is no longer the lookup's: one going on stops, and the first step takes its controls back.
    test('stores what is typed, as typed, in any state, drops the lookup\'s answer and leaves its wait', () => {
      assertProperty([state, fc.string()], (before, name) => {
        const named = withForm(before, { maybeName: Opt.some(name), lookup: { _tag: 'Idle' } })
        return Equal.equals(
          step(Msg.NameChanged({ name }), before).after,
          named._tag === 'LookingUp' ? { _tag: 'Naming', form: named.form } : named,
        )
      })
    })
  })

  test('NameCleared empties the name, drawing the input anew, drops the lookup\'s answer, and is rejected with no name to clear', () => {
    assertProperty(
      [state],
      (before) =>
        before._tag === 'Naming' && Opt.exists(before.form.maybeName, (name) => name !== '')
          ? Equal.equals(step(Msg.NameCleared(), before), {
            rejected: false,
            after: withForm(before, {
              maybeName: Opt.none(),
              replacements: before.form.replacements + 1,
              lookup: { _tag: 'Idle' },
            }),
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

  // Scanning the barcode the name already is draws nothing anew, but looks it up again: that is how a failed
  // lookup is retried. The answer of an earlier lookup is gone with it.
  test('Scanned names the product, closes the scanner, and waits for the lookup of the barcode', () => {
    assertProperty([scanning, fc.oneof(fc.string(), barcode)], (before, scanned) => {
      fc.pre(readsCamera(before))
      const named = Opt.contains(before.form.maybeName, scanned)
        ? before.form
        : { ...before.form, maybeName: Opt.some(scanned), replacements: before.form.replacements + 1 }
      return Equal.equals(step(Msg.Scanned({ barcode: scanned }), before), {
        rejected: false,
        after: { _tag: 'LookingUp', form: { ...named, lookup: { _tag: 'Idle' } }, barcode: scanned },
        commands: [],
        events: [],
      })
    })
  })

  describe('LookedUp', () => {
    test('a product found replaces the barcode, drawing the input anew, and says where the name came from, back on the first step', () => {
      assertProperty(
        [lookingUp, fc.string({ minLength: 1 }), fc.webUrl()],
        (before, name, url) =>
          Equal.equals(step(Msg.LookedUp({ barcode: before.barcode, outcome: { _tag: 'Found', name, url } }), before), {
            rejected: false,
            after: {
              _tag: 'Naming',
              form: {
                ...before.form,
                maybeName: Opt.some(name),
                replacements: before.form.replacements + 1,
                lookup: { _tag: 'Found', url },
              },
            },
            commands: [],
            events: [],
          }),
      )
    })

    test('a product unknown, or a failed lookup, keeps the barcode, and says so, back on the first step', () => {
      assertProperty(
        [lookingUp, fc.constantFrom('NotFound' as const, 'Failed' as const)],
        (before, tag) =>
          Equal.equals(step(Msg.LookedUp({ barcode: before.barcode, outcome: { _tag: tag } }), before), {
            rejected: false,
            after: { _tag: 'Naming', form: { ...before.form, lookup: { _tag: tag } } },
            commands: [],
            events: [],
          }),
      )
    })
  })

  // The runtime interrupts the lookup's subscription: its answer never arrives.
  test('LookupCancelled stops the lookup, the barcode kept as the name, back on the first step, and is rejected otherwise', () => {
    assertProperty([state], (before) =>
      before._tag === 'LookingUp'
        ? Equal.equals(step(Msg.LookupCancelled(), before), {
          rejected: false,
          after: { _tag: 'Naming', form: before.form },
          commands: [],
          events: [],
        })
        : rejects(Msg.LookupCancelled(), before))
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
        [offTheDate, digit],
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
        && Equal.equals(commands, succeeded ? [] : [Cmd.ShowToast({ text: 'Couldn\'t save the date order' })])
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
      assertProperty([offTheDate, utc], (before, date) => rejects(Msg.DateChosen({ date }), before))
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

    test('is rejected while the lookup goes on, under the scanner and while a product is being added', () => {
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

    // After a product added as it is, the name stays: "Add without date" adds it again, so the snackbar's
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

    test('shows the snackbar for 6 seconds from when the product was added, but under the scanner and while the lookup goes on', () => {
      const seconds = fc.integer({ min: -10, max: 10 })
      assertProperty([state, seconds], (before, elapsed) =>
        Opt.match(before.form.maybeLastAdded, {
          onNone: () => true,
          onSome: (product) => {
            const model = makeModel(
              withForm(before, { maybeNow: Opt.some(DateTime.add(product.creationDate, { seconds: elapsed })) }),
            )
            const shown = model._tag === 'Naming' || model._tag === 'Dating' || model._tag === 'Adding'
              ? Opt.map(model.maybeJustAdded, (justAdded) => justAdded.product)
              : Opt.none()
            return Equal.equals(
              shown,
              before._tag !== 'Scanning' && before._tag !== 'LookingUp' && elapsed < 6 ? Opt.some(product) : Opt.none(),
            )
          },
        }))
    })

    test('withholds the snackbar\'s action while a product is being added', () => {
      assertProperty([submitting], (s) => {
        const model = makeModel(s)
        return model._tag === 'Adding'
          && Opt.match(model.maybeJustAdded, {
            onNone: () => true,
            onSome: ({ maybeRepeat }) => Opt.isNone(maybeRepeat),
          })
      })
    })

    test('waits for the lookup exactly while it goes on, offering only to cancel it and to close', () => {
      assertProperty([state], (s) => {
        const model = makeModel(s)
        return s._tag === 'LookingUp'
          ? Equal.equals(model, {
            _tag: 'LookingUp',
            supporting: { _tag: 'LookingUp' },
            name: Opt.getOrElse(s.form.maybeName, () => ''),
            nameKey: s.form.replacements,
            close: Msg.Closed(),
            cancelLookup: Msg.LookupCancelled(),
          })
          : model._tag !== 'LookingUp'
      })
    })

    test('the first step shows the name, drawn anew with each replacement, in every state, and the scanner the camera', () => {
      assertProperty([state], (s) => {
        const model = makeModel(s)
        return model.name === Opt.getOrElse(s.form.maybeName, () => '')
          && model.nameKey === s.form.replacements
          && (model._tag !== 'Scanning' || model.camera === s.form.camera)
      })
    })

    // A lookup's text comes from a scan, which needs the camera: it wins when the camera failed on a later opening.
    test('the name\'s supporting text says what the lookup found, or else that the camera is unavailable, in every state', () => {
      assertProperty([state], (s) => {
        const { lookup, camera } = s.form
        const expected = s._tag === 'LookingUp'
          ? { _tag: 'LookingUp' }
          : lookup._tag === 'Found'
          ? { _tag: 'FromOpenFoodFacts', url: lookup.url }
          : lookup._tag === 'NotFound'
          ? { _tag: 'NotOnOpenFoodFacts' }
          : lookup._tag === 'Failed'
          ? { _tag: 'LookupFailed' }
          : camera === 'Unavailable'
          ? { _tag: 'CameraUnavailable' }
          : { _tag: 'Nothing' }
        return Equal.equals(makeModel(s).supporting, expected)
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
          && Equal.equals(commands, [Cmd.ShowToast({ text: 'Couldn\'t add the product' })])
      })
    })
  })

  test('Closed asks the parent to leave the page on the first step, the lookup going on or not, and is rejected otherwise', () => {
    assertProperty([state], (before) => {
      if (before._tag !== 'Naming' && before._tag !== 'LookingUp') return rejects(Msg.Closed(), before)
      const { after, commands, events } = step(Msg.Closed(), before)
      return Equal.equals(after, before) && commands.length === 0 && Equal.equals(events, [Ev.LeaveRequested()])
    })
  })

  test('BackPressed leaves the page, closes the scanner or the second step first, and is held while adding', () => {
    assertProperty([state], (before) => {
      const { after, commands, events } = step(Msg.BackPressed(), before)
      const expected = before._tag === 'Naming' || before._tag === 'LookingUp'
        ? { after: before, events: [Ev.LeaveRequested()] }
        : before._tag === 'Scanning' || before._tag === 'Dating'
        ? { after: { _tag: 'Naming', form: before.form }, events: [] }
        : { after: before, events: [] }
      return Equal.equals(after, expected.after) && commands.length === 0 && Equal.equals(events, expected.events)
    })
  })
})

// The back button is observed in every state: while a product is being added, so that it does not leave the app.
test('the page listens to the clock, the date order and the back button, to the camera while the scanner is open until it fails, and to the lookup of the barcode it looks up', () => {
  assertProperty([state], (s) => {
    const subscriptions = Tea.subscriptionsOf(program)(s)
    const lookups = [...HashMap.keys(subscriptions)].filter((key) => String(key).startsWith('lookup:'))
    return HashMap.has(subscriptions, 'clock')
      && HashMap.has(subscriptions, 'date-order')
      && HashMap.has(subscriptions, 'back-button')
      && HashMap.has(subscriptions, 'scanner') === readsCamera(s)
      && Equal.equals(lookups, s._tag === 'LookingUp' ? [`lookup:${s.barcode}`] : [])
  })
})

describe('the lookup', () => {
  const code = '8076800195057'

  /** The messages the lookup's subscription sends, and the one it ends with, on a service that answers `answer`. */
  const endsWith = async (answer: Effect.Effect<Opt.Option<FoundProduct>, ProductLookupError>) => {
    const s: State = {
      _tag: 'LookingUp',
      form: {
        maybeName: Opt.some(code),
        replacements: 0,
        camera: 'Available',
        lookup: { _tag: 'Idle' },
        maybeNow: Opt.none(),
        maybeOrder: Opt.none(),
        maybeLastAdded: Opt.none(),
      },
      barcode: code,
    }
    // Typed with every service of the page, of which it reads the lookup's only.
    const subscription = Opt.getOrThrow(
      HashMap.get(Tea.subscriptionsOf(program)(s), `lookup:${code}`),
    ) as Tea.Subscription<Message, ProductLookup>
    const [elements, done] = await Effect.runPromise(
      Effect.zip(Channel.runCollect(subscription), Channel.runDrain(subscription)).pipe(
        Effect.provideService(ProductLookup, { lookup: () => answer }),
        Effect.provideService(References.MinimumLogLevel, 'None'),
      ),
    )
    return { elements, done }
  }

  const found = (name: string, maybeBrand: Opt.Option<string>): FoundProduct => ({
    name,
    maybeBrand,
    maybeQuantity: Opt.some('500 g'),
    url: `https://world.openfoodfacts.org/product/${code}`,
  })

  test('names a product found with its first brand in front, unless the name already says it', async () => {
    const cases = [
      [found('Spaghetti n.5', Opt.some('Barilla')), 'Barilla Spaghetti n.5'],
      [found('Nutella', Opt.some('Nutella')), 'Nutella'],
      [found('Coca cola can', Opt.some('Coca Cola')), 'Coca cola can'],
      [found('Milk', Opt.none()), 'Milk'],
    ] as const
    for (const [product, name] of cases) {
      expect(await endsWith(Effect.succeedSome(product))).toEqual({
        elements: [],
        done: Msg.LookedUp({ barcode: code, outcome: { _tag: 'Found', name, url: product.url } }),
      })
    }
  })

  test('ends with a message of its own when the product is unknown, and when the lookup failed', async () => {
    expect(await endsWith(Effect.succeedNone)).toEqual({
      elements: [],
      done: Msg.LookedUp({ barcode: code, outcome: { _tag: 'NotFound' } }),
    })
    expect(await endsWith(Effect.fail(new ProductLookupError({ cause: new Error('Offline') })))).toEqual({
      elements: [],
      done: Msg.LookedUp({ barcode: code, outcome: { _tag: 'Failed' } }),
    })
  })
})
