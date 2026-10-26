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
import { type Command, type Digit, type Event, type Message, type Model, program, type State } from './program.ts'
import { digit, editing, message, state, submitting } from './program.test_arbitrary.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()
const Ev = Data.taggedEnum<Event>()

const { outcome, rejects, step } = outcomesOf(program.update)

const { makeModel } = program

const digits: ReadonlyArray<Digit> = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

type Editing = Extract<State, { readonly _tag: 'Editing' }>

/** The days the page offers, by the rules of a product: those the digits name, from the clock's time on. */
const offeredDates = (form: State) =>
  Opt.match(form.maybeNow, {
    onNone: () => [],
    onSome: (now) => datesOf(form.digits, now).filter(Product.canExpireOn(now)),
  })

const productOf = (form: Editing, maybeExpirationDate: Opt.Option<DateTime.Utc>) =>
  Opt.flatMap(
    Opt.all([form.maybeName, form.maybeNow]),
    ([name, creationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
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
        Msg.Started({ maybeExpirationDate: Opt.none() }),
        // The days the digits name, and any other.
        ...[date, ...offeredDates(before)].map((day) => Msg.Started({ maybeExpirationDate: Opt.some(day) })),
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
          Equal.equals(step(Msg.NameChanged({ name }), before).after, { ...before, maybeName: Opt.some(name) }),
      )
    })
  })

  describe('the keypad', () => {
    test('types a digit after the others, up to the longest date', () => {
      assertProperty([editing, digit], (before, typed) =>
        before.digits.length >= MAX_DIGITS
          ? rejects(Msg.DigitTyped({ digit: typed }), before)
          : Equal.equals(step(Msg.DigitTyped({ digit: typed }), before).after, {
            ...before,
            digits: before.digits + typed,
          }))
    })

    test('erases the last digit, or is rejected when there is none', () => {
      assertProperty([editing], (before) =>
        before.digits === ''
          ? rejects(Msg.DigitErased(), before)
          : Equal.equals(step(Msg.DigitErased(), before).after, { ...before, digits: before.digits.slice(0, -1) }))
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
        Equal.equals(step(Msg.TimeChanged({ now }), before).after, { ...before, maybeNow: Opt.some(now) }),
    )
  })

  test('Scanned names the product after another barcode, and draws the name anew', () => {
    assertProperty([state, fc.string()], (before, barcode) => {
      const { after } = step(Msg.Scanned({ barcode }), before)
      return Opt.contains(before.maybeName, barcode)
        ? Equal.equals(after, before)
        : Equal.equals(after, { ...before, maybeName: Opt.some(barcode), scans: before.scans + 1 })
    })
  })

  test('CameraFailed turns the camera off', () => {
    assertProperty(
      [state],
      (before) => Equal.equals(step(Msg.CameraFailed(), before).after, { ...before, isCameraOn: false }),
    )
  })

  describe('Started', () => {
    // The product is created at the time the page last heard: the rules of a product decide.
    test('adds the product on a day the digits name, and is rejected on any other', () => {
      assertProperty([editing, utc], (before, date) => {
        const offered = offeredDates(before)
        return [...offered, date].every((expiration) => {
          const isOffered = offered.some((d) => DateTime.Equivalence(d, expiration))
          const maybeProduct = isOffered ? productOf(before, Opt.some(expiration)) : Opt.none()
          const msg = Msg.Started({ maybeExpirationDate: Opt.some(expiration) })
          if (Opt.isNone(maybeProduct)) {
            return rejects(msg, before)
          }
          const { after, commands } = step(msg, before)
          return Equal.equals(after, { ...before, _tag: 'Submitting', product: maybeProduct.value })
            && Equal.equals(commands, [Cmd.Add({ product: maybeProduct.value })])
        })
      })
    })

    test('adds a product that never expires only before any digit is typed', () => {
      assertProperty([editing], (before) => {
        const msg = Msg.Started({ maybeExpirationDate: Opt.none() })
        const maybeProduct = before.digits === '' ? productOf(before, Opt.none()) : Opt.none()
        return Opt.match(maybeProduct, {
          onNone: () => rejects(msg, before),
          onSome: (product) => Equal.equals(step(msg, before).commands, [Cmd.Add({ product })]),
        })
      })
    })

    test('is rejected while a product is being added', () => {
      assertProperty(
        [submitting, fc.option(utc, { nil: undefined })],
        (before, date) => rejects(Msg.Started({ maybeExpirationDate: Opt.fromNullishOr(date) }), before),
      )
    })
  })

  // Guards against the properties above passing only on rejections.
  test('the arbitrary forms offer days to add the product on, and some that the name does not allow', () => {
    const offers = fc.sample(editing, 1_000).map(makeModel).flatMap((model) =>
      model._tag === 'Editing' ? model.choices : []
    )
    expect(offers.some((choice) => Opt.isSome(choice.maybeAdd))).toBe(true)
    expect(offers.some((choice) => Opt.isNone(choice.maybeAdd))).toBe(true)
  })

  test('the model shows the product added last for 4 seconds from when it was added', () => {
    const seconds = fc.integer({ min: -10, max: 10 })
    assertProperty([state, seconds], (form, elapsed) =>
      Opt.match(form.maybeLastAdded, {
        onNone: () => true,
        onSome: (product) => {
          const now = DateTime.add(product.creationDate, { seconds: elapsed })
          const model = makeModel({ ...form, maybeNow: Opt.some(now) })
          return Opt.isSome(model.maybeJustAdded) === elapsed < 4
        },
      }))
  })

  describe('Completed', () => {
    test('success keeps the page for the next product, with its name and no digits', () => {
      assertProperty([submitting], (before) => {
        const { after, commands } = step(Msg.Completed({ succeeded: true }), before)
        const { product, ...form } = before
        return Equal.equals(after, { ...form, _tag: 'Editing', digits: '', maybeLastAdded: Opt.some(product) })
          && commands.length === 0
      })
    })

    test('failure gives the form back, as it was, and says so with a toast', () => {
      assertProperty([submitting], (before) => {
        const { after, commands } = step(Msg.Completed({ succeeded: false }), before)
        const { product: _, ...form } = before
        return Equal.equals(after, { ...form, _tag: 'Editing' })
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
      && HashMap.has(subscriptions, 'scanner') === s.isCameraOn
  })
})
