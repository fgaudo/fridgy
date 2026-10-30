import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as References from 'effect/References'
import * as fc from 'fast-check'
import * as Product from '#domain/product.ts'
import { arbitrary as order } from '#libs/dates/date-order.test_arbitrary.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import { arbitrary as anyDay } from '#libs/dates/day.test_arbitrary.ts'
import * as Day from '#libs/dates/day.ts'
import * as DigitDateEntry from '#libs/dates/digit-date-entry.ts'
import { MAX_DIGITS } from '#libs/dates/digit-dates.ts'
import { messagesSentBy } from '#libs/tea-react/view.test_support.ts'
import { zoned } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import {
  barcode,
  dating,
  digit,
  keyboardInset,
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
  type Due,
  type Event,
  type Failure,
  type Form,
  type Fridge,
  type FridgeShown,
  type Message,
  type Model,
  program,
  type Snackbar,
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
    onSome: ([now, order]) => DigitDateEntry.offered(date, Day.fromDateTime(now), order, Product.canExpireOn(now)),
  })

/** Whether more digits typed after the form's can name a day a product added now may expire on. */
const canCompleteDate = (form: Form, date: DateForm) =>
  Opt.match(Opt.all([form.maybeNow, form.maybeOrder]), {
    onNone: () => false,
    onSome: ([now, order]) => DigitDateEntry.canComplete(date, Day.fromDateTime(now), order, Product.canExpireOn(now)),
  })

/** The day the form names: the one picked, while the digits name it, or else the only one they name. */
const namedDate = (form: Form, date: DateForm): Opt.Option<Day.Day> =>
  DigitDateEntry.named(date, offeredDates(form, date))

/** The product the name describes, created at the clock's time, with that expiration. */
const productOf = (form: Form, maybeExpirationDate: Opt.Option<Day.Day>) =>
  Opt.flatMap(
    Opt.all([form.maybeName, form.maybeNow]),
    ([name, creationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
  )

/** The product a step describes: never expiring on the first, expiring on the day named on the second. */
const productOfStep = (state: State & { _tag: 'Naming' | 'Dating' }) =>
  state._tag === 'Naming'
    ? productOf(state.form, Opt.none())
    : Opt.flatMap(namedDate(state.form, state.date), (date) => productOf(state.form, Opt.some(date)))

/** Whether the page reads the camera: while the scanner is open, until it fails. */
const readsCamera = (state: State) => state._tag === 'Scanning' && state.form.camera === 'Available'

/** Whether the page looks `barcode` up. */
const looksUp = (state: State, barcode: string) => state._tag === 'LookingUp' && state.barcode === barcode

/** The numbers of the products on their way into the fridge. */
const onTheirWay = (fridge: Fridge): ReadonlyArray<number> =>
  fridge._tag === 'Open' ? fridge.arrivals.map(({ id }) => id) : []

/** Whether the fridge is closing behind the product added as the `id`th. */
const closesBehind = (fridge: Fridge, id: number) => fridge._tag === 'Closing' && fridge.last.id === id

/** The snackbar of a failure, after the one standing, if any. */
const told = (form: Form, failure: Failure): Snackbar =>
  form.snackbar._tag === 'Shown'
    ? { _tag: 'Shown', id: form.snackbar.id + 1, failure, entrance: 'AfterAnother' }
    : { _tag: 'Shown', id: 0, failure, entrance: 'Alone' }

/**
 * A message that cannot arrive in that state: a completion while no product is being added, the camera's while
 * the page does not read it, a lookup's answer for a barcode it does not look up, a snackbar's end without one, the
 * arrival of a product not on its way, or the fridge's closing behind a product it is not closing behind.
 */
const cannotArrive = (msg: Message, before: State) =>
  (msg._tag === 'Completed' && before._tag !== 'Submitting')
  || (msg._tag === 'SnackbarExpired' && before.form.snackbar._tag === 'None')
  || ((msg._tag === 'Scanned' || msg._tag === 'CameraFailed') && !readsCamera(before))
  || (msg._tag === 'LookedUp' && !looksUp(before, msg.barcode))
  || (msg._tag === 'Arrived' && !onTheirWay(before.form.fridge).includes(msg.id))
  || (msg._tag === 'FridgeClosed' && !closesBehind(before.form.fridge, msg.id))

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
      expect(() => program.update(msg)(before)).toThrow(Tea.InvariantDefect)
      return true
    })
  })

  // Each message the view sends is accepted in the state it was rendered from; sent twice from the same frame,
  // it acts once, but the keypad's digit keys, which are meant to repeat, and the close button, whose second
  // press the parent ignores once the page is gone. And what the user could ask for and `update` accepts is in
  // the view, but the name's input off the first step, where it is covered.
  test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
    const check = dispatchViolations(program.update, {
      repeatable: (msg) => msg._tag === 'DigitTyped' || msg._tag === 'DigitErased' || msg._tag === 'Closed',
      withheld: (msg, state) =>
        msg._tag === 'NameChanged' && state._tag !== 'Naming'
        && !(state._tag === 'Submitting' && state.step._tag === 'Naming'),
    })
    fc.assert(fc.property(state, fc.string(), anyDay, (before, inputValue, date) => {
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

  // Scanning again is how a failed lookup is retried. The answer of an earlier lookup is gone with it.
  test('Scanned empties the name, drawing the input anew, closes the scanner with a vibration, and waits for the lookup of the barcode', () => {
    assertProperty([scanning, fc.oneof(fc.string(), barcode)], (before, scanned) => {
      fc.pre(readsCamera(before))
      return Equal.equals(step(Msg.Scanned({ barcode: scanned }), before), {
        rejected: false,
        after: {
          _tag: 'LookingUp',
          form: {
            ...before.form,
            maybeName: Opt.none(),
            replacements: before.form.replacements + 1,
            lookup: { _tag: 'Idle' },
          },
          barcode: scanned,
        },
        commands: [Cmd.Vibrate({ feedback: 'Confirm' })],
        events: [],
      })
    })
  })

  describe('LookedUp', () => {
    test('a product found names it, drawing the input anew, and says where the name came from, back on the first step', () => {
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

    test('a product unknown leaves the name empty, and says so with the barcode, back on the first step', () => {
      assertProperty(
        [lookingUp],
        (before) =>
          Equal.equals(step(Msg.LookedUp({ barcode: before.barcode, outcome: { _tag: 'NotFound' } }), before), {
            rejected: false,
            after: { _tag: 'Naming', form: { ...before.form, lookup: { _tag: 'NotFound', barcode: before.barcode } } },
            commands: [],
            events: [],
          }),
      )
    })

    test('a failed lookup leaves the name empty, and says so, back on the first step', () => {
      assertProperty(
        [lookingUp],
        (before) =>
          Equal.equals(step(Msg.LookedUp({ barcode: before.barcode, outcome: { _tag: 'Failed' } }), before), {
            rejected: false,
            after: { _tag: 'Naming', form: { ...before.form, lookup: { _tag: 'Failed' } } },
            commands: [],
            events: [],
          }),
      )
    })
  })

  // The runtime interrupts the lookup's subscription: its answer never arrives.
  test('LookupCancelled stops the lookup, the name left empty, back on the first step, and is rejected otherwise', () => {
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
  test('CameraFailed makes the camera unavailable, and says so with a vibration', () => {
    assertProperty([scanning], (before) => {
      fc.pre(readsCamera(before))
      const { after, commands } = step(Msg.CameraFailed(), before)
      return Equal.equals(after, withForm(before, { camera: 'Unavailable' }))
        && Equal.equals(commands, [Cmd.Vibrate({ feedback: 'Reject' })])
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
      [state, zoned],
      (before, now) =>
        Equal.equals(step(Msg.TimeChanged({ now }), before).after, withForm(before, { maybeNow: Opt.some(now) })),
    )
  })

  test('KeyboardMoved keeps how far the keyboard covers the page', () => {
    assertProperty(
      [state, keyboardInset],
      (before, inset) =>
        Equal.equals(step(Msg.KeyboardMoved({ inset }), before).after, withForm(before, { keyboardInset: inset })),
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

  test('OrderKept changes nothing, and says so with a snackbar, after the one standing, and a vibration when the order could not be kept', () => {
    assertProperty([state, fc.boolean()], (before, succeeded) => {
      const { after, commands } = step(Msg.OrderKept({ succeeded }), before)
      return Equal.equals(after, succeeded ? before : withForm(before, { snackbar: told(before.form, 'OrderNotKept') }))
        && Equal.equals(commands, succeeded ? [] : [Cmd.Vibrate({ feedback: 'Reject' })])
    })
  })

  describe('SnackbarExpired', () => {
    test('withdraws the snackbar, in any state, and touches nothing else', () => {
      assertProperty([state], (before) => {
        fc.pre(before.form.snackbar._tag === 'Shown')
        const { after, commands } = step(Msg.SnackbarExpired(), before)
        return Equal.equals(after, withForm(before, { snackbar: { _tag: 'None' } })) && commands.length === 0
      })
    })

    // The timer runs only while a snackbar is shown, so its end heard otherwise is a bug.
    test('is a defect when no snackbar is shown', () => {
      assertProperty([state], (before) => {
        fc.pre(before.form.snackbar._tag === 'None')
        expect(() => program.update(Msg.SnackbarExpired())(before)).toThrow(Tea.InvariantDefect)
        return true
      })
    })
  })

  describe('DateChosen', () => {
    test('picks a day the digits name, unless the form already names it, and is rejected on any other day', () => {
      assertProperty([dating, anyDay], (before, date) => {
        const offered = offeredDates(before.form, before.date)
        return [...offered, date].every((day) => {
          const msg = Msg.DateChosen({ date: day })
          const isOffered = offered.some((d) => d === day)
          return isOffered && !Opt.contains(namedDate(before.form, before.date), day)
            ? Equal.equals(step(msg, before).after, withDate(before, { maybeChosenDate: Opt.some(day) }))
            : rejects(msg, before)
        })
      })
    })

    test('is rejected off the second step', () => {
      assertProperty([offTheDate, anyDay], (before, date) => rejects(Msg.DateChosen({ date }), before))
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

  // Guards against the properties above passing only on rejections.
  test('the arbitrary steps describe a product at times, and at times not, with days to pick', () => {
    const namings = fc.sample(naming, 1_000).map(makeModel)
    const datings = fc.sample(dating, 1_000).map(makeModel)
    const choices = datings.flatMap((model) =>
      model._tag === 'Dating' && model.strip._tag === 'Naming' ? model.strip.choices : []
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

    test('while adding from the first step, tells whether the scanner was offered, so that the step is drawn as it was', () => {
      assertProperty([submitting], (s) => {
        const model = makeModel(s)
        return model._tag === 'Adding'
          && (model.step._tag !== 'Naming' || model.step.canScan === (s.form.camera === 'Available'))
      })
    })

    // The scanner rises over the first step and the date step covers it: neither draws the fridge.
    // A product is made once the clock has ticked: before, nothing is on its way.
    test('shows the fridge on the first step, while it takes input and while it adds, each product on its way due as Home tells it, and nowhere else', () => {
      assertProperty([state], (s) => {
        const model = makeModel(s)
        const shown = model._tag === 'Naming'
          ? Opt.some(model.fridge)
          : model._tag === 'Adding' && model.step._tag === 'Naming'
          ? Opt.some(model.step.fridge)
          : Opt.none()
        const onFirstStep = s._tag === 'Naming' || (s._tag === 'Submitting' && s.step._tag === 'Naming')
        const { fridge, maybeNow } = s.form
        const expected: FridgeShown = Opt.match(maybeNow, {
          onNone: (): FridgeShown => ({ _tag: 'Away' }),
          onSome: (now): FridgeShown =>
            fridge._tag === 'Open'
              ? {
                ...fridge,
                arrivals: Arr.map(fridge.arrivals, (arrival) => ({
                  ...arrival,
                  due: Opt.match(arrival.product.maybeExpirationDate, {
                    onNone: (): Due => ({ _tag: 'Never' }),
                    onSome: (expirationDate): Due => {
                      const days = Day.daysBetween(Day.fromDateTime(now), expirationDate)
                      return days <= 1
                        ? { _tag: 'Now', expirationDate }
                        : days <= Product.SOON_DAYS
                        ? { _tag: 'Soon', expirationDate }
                        : { _tag: 'Later', expirationDate }
                    },
                  }),
                })),
              }
              : fridge,
        })
        return Equal.equals(shown, onFirstStep ? Opt.some(expected) : Opt.none())
      })
    })

    test('waits for the lookup exactly while it goes on, offering only to cancel it and to close', () => {
      assertProperty([state], (s) => {
        const model = makeModel(s)
        return s._tag === 'LookingUp'
          ? Equal.equals(model, {
            _tag: 'LookingUp',
            keyboardInset: s.form.keyboardInset,
            supporting: { _tag: 'LookingUp', barcode: s.barcode },
            name: Opt.getOrElse(s.form.maybeName, () => ''),
            nameKey: s.form.replacements,
            snackbar: s.form.snackbar,
            close: Msg.Closed(),
            cancelLookup: Msg.LookupCancelled(),
          })
          : model._tag !== 'LookingUp'
      })
    })

    test('every state draws how far the page keeps clear of the keyboard', () => {
      assertProperty([state], (s) => makeModel(s).keyboardInset === s.form.keyboardInset)
    })

    test('the first step shows the name, drawn anew with each replacement, in every state, the scanner the camera, and every state the snackbar the form holds', () => {
      assertProperty([state], (s) => {
        const model = makeModel(s)
        return model.name === Opt.getOrElse(s.form.maybeName, () => '')
          && model.nameKey === s.form.replacements
          && Equal.equals(model.snackbar, s.form.snackbar)
          && (model._tag !== 'Scanning' || model.camera === s.form.camera)
      })
    })

    // A lookup's text comes from a scan, which needs the camera: it wins when the camera failed on a later opening.
    test('the name\'s supporting text says what the lookup found, or else that the camera is unavailable, in every state', () => {
      assertProperty([state], (s) => {
        const { lookup, camera } = s.form
        const expected = s._tag === 'LookingUp'
          ? { _tag: 'LookingUp', barcode: s.barcode }
          : lookup._tag === 'Found'
          ? { _tag: 'FromOpenFoodFacts', url: lookup.url }
          : lookup._tag === 'NotFound'
          ? { _tag: 'NotOnOpenFoodFacts', barcode: lookup.barcode }
          : lookup._tag === 'Failed'
          ? { _tag: 'LookupFailed' }
          : camera === 'Unavailable'
          ? { _tag: 'CameraUnavailable' }
          : { _tag: 'Nothing' }
        return Equal.equals(makeModel(s).supporting, expected)
      })
    })

    // The days can be picked only while the step takes them: not while the product is being added.
    test('the date field shows the digits as typed; the strip the hint while they name no day yet, the days they name in the order in use with the one picked, or that no more digits can name one', () => {
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
            const expected = offered.length === 0
              ? date.digits === '' || canCompleteDate(s.form, date) ? { _tag: 'Hint' } : { _tag: 'NamingNothing' }
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
    // The second step leaves with its own transition.
    test('success starts the next product at the name, this one\'s kept in the same field, sends it into the fridge by its number, and vibrates', () => {
      assertProperty([submitting], (before) => {
        const { after, commands } = step(Msg.Completed({ succeeded: true }), before)
        const { fridge, added } = before.form
        const coming = { id: added, product: before.product }
        const expected: Fridge = fridge._tag === 'Away'
          ? { _tag: 'Open', visit: added, opening: 'WithFridge', arrivals: [{ ...coming, entrance: 'WithFridge' }] }
          : fridge._tag === 'Open'
          ? { ...fridge, arrivals: [...fridge.arrivals, { ...coming, entrance: 'IntoOpenFridge' }] }
          : {
            _tag: 'Open',
            visit: fridge.visit,
            opening: 'Again',
            arrivals: [{ ...coming, entrance: 'IntoOpenFridge' }],
          }
        return Equal.equals(after, {
          _tag: 'Naming',
          form: { ...before.form, added: added + 1, fridge: expected },
        })
          && Equal.equals(commands, [Cmd.Vibrate({ feedback: 'Confirm' })])
      })
    })

    // Two products added within a second have the same creation date: their numbers tell them apart.
    test('two successes in a row send both products on their way, each by a number of its own', () => {
      assertProperty([submitting], (before) => {
        const after = step(Msg.Completed({ succeeded: true }), before).after
        const again = step(Msg.Completed({ succeeded: true }), {
          _tag: 'Submitting',
          form: after.form,
          product: before.product,
          step: { _tag: 'Naming' },
        }).after
        const ids = onTheirWay(again.form.fridge)
        return ids.length >= 2 && new Set(ids).size === ids.length
      })
    })

    test('failure gives the step back, as it was, and says so with a snackbar, after the one standing, and a vibration', () => {
      assertProperty([submitting], (before) => {
        const { after, commands } = step(Msg.Completed({ succeeded: false }), before)
        return Equal.equals(after, resumed(before.step, { ...before.form, snackbar: told(before.form, 'AddFailed') }))
          && Equal.equals(commands, [Cmd.Vibrate({ feedback: 'Reject' })])
      })
    })
  })

  describe('the fridge', () => {
    test('Arrived takes the product out of those on their way, in any state, and closes the door behind the last', () => {
      assertProperty([state], (before) => {
        const { fridge } = before.form
        return fridge._tag !== 'Open' || fridge.arrivals.every((arrival) => {
          const rest = fridge.arrivals.filter(({ id }) => id !== arrival.id)
          const expected: Fridge = Arr.isReadonlyArrayNonEmpty(rest)
            ? { ...fridge, arrivals: rest }
            : { _tag: 'Closing', visit: fridge.visit, last: arrival }
          return Equal.equals(
            step(Msg.Arrived({ id: arrival.id }), before).after,
            withForm(before, { fridge: expected }),
          )
        })
      })
    })

    test('FridgeClosed sends the fridge away, in any state', () => {
      assertProperty([state], (before) => {
        const { fridge } = before.form
        return fridge._tag !== 'Closing'
          || Equal.equals(
            step(Msg.FridgeClosed({ id: fridge.last.id }), before).after,
            withForm(before, { fridge: { _tag: 'Away' } }),
          )
      })
    })

    // The timers are keyed by the product they wait for, so an end heard for any other is a bug.
    test('Arrived is a defect for a product not on its way, FridgeClosed for one the fridge is not closing behind', () => {
      assertProperty([state, fc.nat({ max: 12 })], (before, id) => {
        const { fridge } = before.form
        if (!onTheirWay(fridge).includes(id)) {
          expect(() => program.update(Msg.Arrived({ id }))(before)).toThrow(Tea.InvariantDefect)
        }
        if (!closesBehind(fridge, id)) {
          expect(() => program.update(Msg.FridgeClosed({ id }))(before)).toThrow(Tea.InvariantDefect)
        }
        return true
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
test('the page listens to the clock, the date order, the back button and the keyboard, to the camera while the scanner is open until it fails, to the lookup of the barcode it looks up, and times each product on its way into the fridge, the fridge\'s closing and the snackbar', () => {
  assertProperty([state, fc.nat({ max: 12 })], (s, id) => {
    const subscriptions = Tea.subscriptionsOf(program)(s)
    const lookups = [...HashMap.keys(subscriptions)].filter((key) => String(key).startsWith('lookup:'))
    const { fridge } = s.form
    return HashMap.has(subscriptions, 'clock')
      && HashMap.has(subscriptions, 'date-order')
      && HashMap.has(subscriptions, 'back-button')
      && HashMap.has(subscriptions, 'keyboard')
      && HashMap.has(subscriptions, 'scanner') === readsCamera(s)
      && Equal.equals(lookups, s._tag === 'LookingUp' ? [`lookup:${s.barcode}`] : [])
      && HashMap.has(subscriptions, ['arriving', id]) === onTheirWay(fridge).includes(id)
      && HashMap.has(subscriptions, ['closing', id]) === closesBehind(fridge, id)
      && (s.form.snackbar._tag === 'None' || HashMap.has(subscriptions, ['snackbar', s.form.snackbar.id]))
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
        added: 0,
        fridge: { _tag: 'Away' },
        snackbar: { _tag: 'None' },
        keyboardInset: 0,
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
