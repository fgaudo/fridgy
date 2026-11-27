import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { applyAll, dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as References from 'effect/References'
import * as fc from 'fast-check'
import * as Expiration from '#app/programs/expiration/program.ts'
import * as SnackbarProgram from '#app/programs/snackbar/program.ts'
import * as Product from '#domain/product.ts'
import { type FoundProduct, ProductLookup, ProductLookupError } from '#infrastructure/product-lookup/product-lookup.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import { arbitrary as anyDay } from '#libs/dates/day.test_arbitrary.ts'
import * as Day from '#libs/dates/day.ts'
import type { Digit } from '#libs/dates/digit-date-entry.ts'
import { messagesSentBy } from '#libs/tea-react/view.test_support.ts'
import { zoned } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import * as Fridge from './children/fridge/program.ts'
import {
  barcode,
  dating,
  keyboardInset,
  lookingUp,
  message,
  naming,
  scanning,
  state,
  submitting,
  type Whole,
} from './program.test_arbitrary.ts'
import { type Command, type Event, type Failure, type Message, type Model, program, type State } from './program.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()
const Ev = Data.taggedEnum<Event>()
const Snackbar = SnackbarProgram.make<Failure>()

const { outcome, rejects, step } = outcomesOf(program.update)

const { makeModel } = program

const digits: ReadonlyArray<Digit> = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/** What the name field sends as the user types `value` into it. */
const typed = (value: string): Message => ({ _tag: 'NameTyped', value })

/** A message of the date's view, as the page receives it. */
const toDate = (instance: number) => (message: Expiration.Message): Message => ({
  _tag: 'Expiration',
  instance,
  message,
})

/** The name as the field shows it. */
const nameOf = (s: Whole) => Opt.getOrElse(s.own.maybeName, () => '')

/** The page's own state of a step's, changed. */
const withOwn = (s: Whole, change: Partial<State>): State => ({ ...s.own, ...change })

/** Whether the model draws the name's field to type into: on the first step, while it takes input and while it adds. */
const isNameEditable = (model: Model) =>
  model._tag === 'Naming' || (model._tag === 'Adding' && model.step._tag === 'Naming')

/** Whether the second step is shown: while it takes the date, and while a product is added from it. */
const showsDate = ({ own: { phase } }: Whole) =>
  phase._tag === 'Dating' || (phase._tag === 'Submitting' && phase.from === 'Dating')

/** The date's state, where the second step is shown. */
const dateOf = (s: Whole) => Opt.map(s.children.Expiration, ({ state }) => state)

/** The day the date concludes, when it names one. */
const concludedDay = (s: Whole) =>
  Opt.flatMap(dateOf(s), (date) => {
    const output = Expiration.program.output(date)
    return output._tag === 'On' ? Opt.some(output.day) : Opt.none()
  })

/** The product the name describes, created at the clock's time, with that expiration. */
const productOf = (s: Whole, maybeExpirationDate: Opt.Option<Day.Day>) =>
  Opt.flatMap(
    Opt.all([s.own.maybeName, s.own.maybeNow]),
    ([name, creationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
  )

/** The product a step describes: never expiring on the first, expiring on the day the date concludes on the second. */
const productOfStep = (s: Whole) =>
  s.own.phase._tag === 'Naming'
    ? productOf(s, Opt.none())
    : s.own.phase._tag === 'Dating'
    ? Opt.flatMap(concludedDay(s), (day) => productOf(s, Opt.some(day)))
    : Opt.none()

/** Whether the page reads the camera: while the scanner is open, until it fails. */
const readsCamera = ({ own }: Whole) => own.phase._tag === 'Scanning' && own.camera === 'Available'

/** Whether the page looks `barcode` up. */
const looksUp = ({ own: { phase } }: Whole, code: string) => phase._tag === 'LookingUp' && phase.barcode === code

/** The snackbar's state. */
const snackbarOf = (s: Whole) => Opt.getOrThrow(s.children.Snackbar)

/** The fridge's state. */
const fridgeOf = (s: Whole) => Opt.getOrThrow(s.children.Fridge).state

/**
 * A message that cannot arrive in that state: a completion while no product is being added, the camera's while the
 * page does not read it, a lookup's answer for a barcode it does not look up, or the camera's check once it is
 * known.
 */
const cannotArrive = (msg: Message, before: Whole) =>
  (msg._tag === 'Completed' && before.own.phase._tag !== 'Submitting')
  || ((msg._tag === 'Scanned' || msg._tag === 'CameraFailed') && !readsCamera(before))
  || (msg._tag === 'LookedUp' && !looksUp(before, msg.barcode))
  || (msg._tag === 'CameraChecked' && before.own.camera !== 'Checking')

const onAStep = fc.oneof(naming, dating)

const offAnyStep = fc.oneof(lookingUp, scanning, submitting)

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

  // Each message the view sends, what the name field gives and the date's keys included, is accepted in the state it
  // was rendered from; sent twice from the same frame, it acts once, but the keypad's digit and erase keys, which are
  // meant to repeat, the attribution's link, which opens on every press, and the close button, whose second press the
  // parent ignores once the page is gone. The name already there means nothing. And what the user could ask for and
  // `update` accepts is in the view.
  test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
    fc.assert(fc.property(state, fc.string(), anyDay, (before, inputValue, date) => {
      const model = makeModel(before)
      const named = model._tag === 'Dating' && model.expiration.model.strip._tag === 'Naming'
        ? model.expiration.model.strip.choices.map((choice) => choice.date)
        : []
      // The view sends the date's messages by the instance it draws: a candidate names the one that is there, and
      // there is none of a date that is not.
      const toDateThere = Opt.map(before.children.Expiration, ({ instance }) => toDate(instance))
      const askable = [
        Msg.NameCleared(),
        Msg.ScanRequested(),
        Msg.ScanClosed(),
        Msg.DateRequested(),
        Msg.DateDismissed(),
        Msg.Closed(),
        Msg.LookupCancelled(),
        Msg.Started(),
        ...Opt.match(toDateThere, {
          onNone: () => [],
          onSome: (toDateThere) =>
            [
              { _tag: 'DigitErased' } as const,
              { _tag: 'DateCleared' } as const,
              ...digits.map((digit) => ({ _tag: 'DigitTyped', digit } as const)),
              // The days the digits name, and any other.
              ...[date, ...named].map((day) => ({ _tag: 'DateChosen', date: day } as const)),
              ...DateOrder.all.map((order) => ({ _tag: 'OrderPicked', order } as const)),
            ].map(toDateThere),
        }),
      ]
      expect(dispatchViolations(program.update, {
        state: before,
        held: messagesSentBy<Model, Message>(view, model, inputValue),
        candidates: askable,
        repeatable: (msg) =>
          msg._tag === 'Closed' || msg._tag === 'LinkPressed'
          || (msg._tag === 'Expiration' && (msg.message._tag === 'DigitTyped' || msg.message._tag === 'DigitErased')),
        inert: (msg, s) => msg._tag === 'NameTyped' && msg.value === nameOf(s),
      })).toEqual([])
    }))
  })

  // Another name than the one shown: held where the field is drawn to type into, a candidate wherever the name is
  // stored. Covered by the scanner or the second step, the name still takes a key typed in the frame before, which
  // nothing drawn sends: withheld there.
  test('draws the name to type into exactly where what is typed over it is stored, once', () => {
    fc.assert(fc.property(state, (before) => {
      const model = makeModel(before)
      const over = typed(`${model.name}1`)
      expect(dispatchViolations(program.update, {
        state: before,
        held: isNameEditable(model) ? [over] : [],
        candidates: [over],
        withheld: (_, s) =>
          s.own.phase._tag === 'Scanning' || s.own.phase._tag === 'Dating'
          || (s.own.phase._tag === 'Submitting' && s.own.phase.from === 'Dating'),
      })).toEqual([])
    }))
  })

  test('the view fills NameTyped with what the name field gives, exactly where the model draws it to type into', () => {
    fc.assert(fc.property(state, fc.string(), (before, inputValue) => {
      const model = makeModel(before)
      const sent: ReadonlyArray<Message> = messagesSentBy<Model, Message>(view, model, inputValue).filter((msg) =>
        msg._tag === 'NameTyped'
      )
      expect(sent).toEqual(isNameEditable(model) ? [typed(inputValue)] : [])
    }))
  })

  describe('NameTyped', () => {
    // Covered or disabled, the name still takes a key typed just before. The name is no longer the lookup's.
    test('stores what is typed, as typed, and drops the lookup\'s answer, in any phase but the lookup\'s', () => {
      assertProperty([state, fc.string()], (before, name) => {
        fc.pre(before.own.phase._tag !== 'LookingUp' && name !== nameOf(before))
        return Equal.equals(
          step(typed(name), before).after.own,
          withOwn(before, { maybeName: Opt.some(name), lookup: { _tag: 'Idle' } }),
        )
      })
    })

    test('of the name already there leaves the very same state, the lookup\'s answer kept', () => {
      assertProperty([state], (before) => {
        fc.pre(before.own.phase._tag !== 'LookingUp')
        const { after, commands, events } = step(typed(nameOf(before)), before)
        return after.own === before.own && Equal.equals(after, before) && commands.length === 0
          && events.length === 0
      })
    })

    // The field is drawn read-only meanwhile: the name is the scan's.
    test('is rejected while the scanned barcode is looked up', () => {
      assertProperty([lookingUp, fc.string()], (before, name) => rejects(typed(name), before))
    })
  })

  test('NameCleared empties the name, drawing the field anew, drops the lookup\'s answer, and is rejected with no name to clear', () => {
    assertProperty(
      [state],
      (before) =>
        before.own.phase._tag === 'Naming' && Opt.exists(before.own.maybeName, (name) => name !== '')
          ? Equal.equals(step(Msg.NameCleared(), before), {
            rejected: false,
            after: {
              ...before,
              own: withOwn(before, {
                maybeName: Opt.none(),
                replacements: before.own.replacements + 1,
                lookup: { _tag: 'Idle' },
              }),
            },
            commands: [],
            events: [],
          })
          : rejects(Msg.NameCleared(), before),
    )
  })

  test('ScanRequested opens the scanner once the device can read barcodes, on the first step', () => {
    assertProperty([state], (before) =>
      before.own.phase._tag === 'Naming' && before.own.camera === 'Available'
        ? Equal.equals(step(Msg.ScanRequested(), before), {
          rejected: false,
          after: { ...before, own: withOwn(before, { phase: { _tag: 'Scanning' } }) },
          commands: [],
          events: [],
        })
        : rejects(Msg.ScanRequested(), before))
  })

  test('ScanClosed closes the scanner with the rest kept', () => {
    assertProperty([state], (before) =>
      before.own.phase._tag === 'Scanning'
        ? Equal.equals(step(Msg.ScanClosed(), before), {
          rejected: false,
          after: { ...before, own: withOwn(before, { phase: { _tag: 'Naming' } }) },
          commands: [],
          events: [],
        })
        : rejects(Msg.ScanClosed(), before))
  })

  // Scanning again is how a failed lookup is retried. The answer of an earlier lookup is gone with it.
  test('Scanned empties the name, drawing the field anew, closes the scanner with a vibration, and waits for the lookup of the barcode', () => {
    assertProperty([scanning, fc.oneof(fc.string(), barcode)], (before, scanned) => {
      fc.pre(readsCamera(before))
      const { after, commands, events } = step(Msg.Scanned({ barcode: scanned }), before)
      return Equal.equals(
        after.own,
        withOwn(before, {
          phase: { _tag: 'LookingUp', barcode: scanned },
          maybeName: Opt.none(),
          replacements: before.own.replacements + 1,
          lookup: { _tag: 'Idle' },
        }),
      )
        && Equal.equals(commands, [Cmd.Vibrate({ feedback: 'Confirm' })])
        && events.length === 0
    })
  })

  test('LinkPressed opens its URL in every state, and changes nothing', () => {
    assertProperty([state, fc.webUrl()], (before, url) => {
      const { after, commands, events } = step(Msg.LinkPressed({ url }), before)
      return Equal.equals(after, before) && Equal.equals(commands, [Cmd.OpenLink({ url })]) && events.length === 0
    })
  })

  describe('LookedUp', () => {
    const lookedUp = (before: Whole, result: Message) => {
      const { after, commands, events } = step(result, before)
      return { own: after.own, quiet: commands.length === 0 && events.length === 0 }
    }

    test('a product found names it, drawing the field anew, and says where the name came from, back on the first step', () => {
      assertProperty([lookingUp, fc.string({ minLength: 1 }), fc.webUrl()], (before, name, url) => {
        const code = before.own.phase._tag === 'LookingUp' ? before.own.phase.barcode : ''
        const { own, quiet } = lookedUp(
          before,
          Msg.LookedUp({ barcode: code, outcome: { _tag: 'Found', name, url } }),
        )
        return quiet && Equal.equals(
          own,
          withOwn(before, {
            phase: { _tag: 'Naming' },
            maybeName: Opt.some(name),
            replacements: before.own.replacements + 1,
            lookup: { _tag: 'Found', url },
          }),
        )
      })
    })

    test('a product unknown leaves the name empty, and says so with the barcode, back on the first step', () => {
      assertProperty([lookingUp], (before) => {
        const code = before.own.phase._tag === 'LookingUp' ? before.own.phase.barcode : ''
        const { own, quiet } = lookedUp(before, Msg.LookedUp({ barcode: code, outcome: { _tag: 'NotFound' } }))
        return quiet
          && Equal.equals(
            own,
            withOwn(before, { phase: { _tag: 'Naming' }, lookup: { _tag: 'NotFound', barcode: code } }),
          )
      })
    })

    test('a failed lookup leaves the name empty, and says so, back on the first step', () => {
      assertProperty([lookingUp], (before) => {
        const code = before.own.phase._tag === 'LookingUp' ? before.own.phase.barcode : ''
        const { own, quiet } = lookedUp(before, Msg.LookedUp({ barcode: code, outcome: { _tag: 'Failed' } }))
        return quiet && Equal.equals(own, withOwn(before, { phase: { _tag: 'Naming' }, lookup: { _tag: 'Failed' } }))
      })
    })
  })

  // The runtime interrupts the lookup's subscription: its answer never arrives.
  test('LookupCancelled stops the lookup, the name left empty, back on the first step, and is rejected otherwise', () => {
    assertProperty([state], (before) =>
      before.own.phase._tag === 'LookingUp'
        ? Equal.equals(step(Msg.LookupCancelled(), before), {
          rejected: false,
          after: { ...before, own: withOwn(before, { phase: { _tag: 'Naming' } }) },
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
      return Equal.equals(after.own, withOwn(before, { camera: 'Unavailable' }))
        && Equal.equals(commands, [Cmd.Vibrate({ feedback: 'Reject' })])
    })
  })

  // The root starts each visit of the page anew, and the library rejects an answer for a visit gone: only the check
  // of this visit answers, once.
  describe('CameraChecked', () => {
    test('says whether the device can read barcodes, in any phase, while the camera is being checked', () => {
      assertProperty([state, fc.boolean()], (before, isAvailable) => {
        fc.pre(before.own.camera === 'Checking')
        return Equal.equals(step(Msg.CameraChecked({ isAvailable }), before), {
          rejected: false,
          after: { ...before, own: withOwn(before, { camera: isAvailable ? 'Available' : 'Unavailable' }) },
          commands: [],
          events: [],
        })
      })
    })

    test('is a defect once the camera is known', () => {
      assertProperty([state, fc.boolean()], (before, isAvailable) => {
        fc.pre(before.own.camera !== 'Checking')
        expect(() => program.update(Msg.CameraChecked({ isAvailable }))(before)).toThrow(Tea.InvariantDefect)
        return true
      })
    })
  })

  // The date is the product's: only a name that is one goes on to it.
  test('DateRequested goes on to the date, started anew with no digit and told the time, while the name is a product\'s, on the first step', () => {
    assertProperty([state], (before) => {
      if (before.own.phase._tag !== 'Naming' || Opt.isNone(productOf(before, Opt.none()))) {
        return rejects(Msg.DateRequested(), before)
      }
      const { after, commands, events } = step(Msg.DateRequested(), before)
      return Equal.equals(after.own, withOwn(before, { phase: { _tag: 'Dating' } }))
        && Opt.exists(dateOf(after), (date) =>
          Opt.isNone(date.maybeStored) && date.date._tag === 'Kept'
          && Equal.equals(date.page, { maybeNow: before.own.maybeNow, isLocked: false })
          && Expiration.program.output(date)._tag === 'Never')
        && commands.length === 0 && events.length === 0
    })
  })

  test('DateDismissed goes back to the name, the date forgotten, and is rejected off the second step', () => {
    assertProperty([state], (before) => {
      if (before.own.phase._tag !== 'Dating') return rejects(Msg.DateDismissed(), before)
      const { after, commands } = step(Msg.DateDismissed(), before)
      return Equal.equals(after.own, withOwn(before, { phase: { _tag: 'Naming' } }))
        && Opt.isNone(after.children.Expiration) && commands.length === 0
    })
  })

  // The date reads its days from the page's clock.
  test('TimeChanged keeps the time, and tells it to the date', () => {
    assertProperty([state, zoned], (before, now) => {
      const { after } = step(Msg.TimeChanged({ now }), before)
      return Equal.equals(after.own, withOwn(before, { maybeNow: Opt.some(now) }))
        && Equal.equals(
          Opt.map(dateOf(after), ({ page }) => page.maybeNow),
          Opt.map(dateOf(before), () => Opt.some(now)),
        )
    })
  })

  test('KeyboardMoved keeps how far the keyboard covers the page', () => {
    assertProperty(
      [state, keyboardInset],
      (before, inset) =>
        Equal.equals(step(Msg.KeyboardMoved({ inset }), before).after.own, withOwn(before, { keyboardInset: inset })),
    )
  })

  describe('Started', () => {
    // The product is created at the time the page last heard: the rules of a product decide.
    test('adds the product the step describes, never expiring from the first, on the day the date concludes from the second, and is rejected while it describes none', () => {
      assertProperty([onAStep], (before) =>
        Opt.match(productOfStep(before), {
          onNone: () => rejects(Msg.Started(), before),
          onSome: (product) => {
            const from = before.own.phase._tag === 'Naming' ? 'Naming' : 'Dating'
            const { after, commands } = step(Msg.Started(), before)
            return Equal.equals(after.own, withOwn(before, { phase: { _tag: 'Submitting', product, from } }))
              && Equal.equals(commands, [Cmd.Add({ product })])
              && Equal.equals(product.maybeExpirationDate, from === 'Naming' ? Opt.none() : concludedDay(before))
          },
        }))
    })

    // A date step whose digits name no day, or that has none, adds nothing.
    test('is rejected on the second step while the date concludes no day', () => {
      assertProperty([dating], (before) => {
        fc.pre(Opt.isNone(concludedDay(before)))
        return rejects(Msg.Started(), before)
      })
    })

    test('from the second step, tells the date the form is locked, and keeps it', () => {
      assertProperty([dating], (before) => {
        fc.pre(Opt.isSome(productOfStep(before)))
        const { after } = step(Msg.Started(), before)
        const model = makeModel(after)
        return Equal.equals(Opt.map(dateOf(after), ({ page }) => page.isLocked), Opt.some(true))
          && Equal.equals(Opt.map(dateOf(after), ({ date }) => date), dateOf(before).pipe(Opt.map(({ date }) => date)))
          && model._tag === 'Adding' && model.step._tag === 'Dating'
          && Opt.isNone(model.step.expiration.model.maybeKeys)
      })
    })

    test('is rejected while the lookup goes on, under the scanner and while a product is being added', () => {
      assertProperty([offAnyStep], (before) => rejects(Msg.Started(), before))
    })
  })

  // Guards against the properties above passing only on rejections.
  test('the arbitrary steps describe a product at times, and at times not', () => {
    const namings = fc.sample(naming, 1_000).map(makeModel)
    const datings = fc.sample(dating, 1_000).map(makeModel)
    expect(namings.some((model) => model._tag === 'Naming' && Opt.isSome(model.maybeAdd))).toBe(true)
    expect(namings.some((model) => model._tag === 'Naming' && Opt.isNone(model.maybeAdd))).toBe(true)
    expect(datings.some((model) => model._tag === 'Dating' && Opt.isSome(model.maybeAdd))).toBe(true)
    expect(datings.some((model) => model._tag === 'Dating' && Opt.isNone(model.maybeAdd))).toBe(true)
  })

  // What the view draws is decided here, so that it is checked for any state.
  describe('the model', () => {
    test('offers both ways out of the first step exactly while the name is a product\'s', () => {
      assertProperty([naming], (s) => {
        const model = makeModel(s)
        const maybeProduct = productOf(s, Opt.none())
        return model._tag === 'Naming'
          && Equal.equals(model.maybeRequestDate, Opt.map(maybeProduct, () => Msg.DateRequested()))
          && Equal.equals(model.maybeAdd, Opt.map(maybeProduct, () => Msg.Started()))
      })
    })

    test('offers to add the product on the second step exactly while the date concludes its day', () => {
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
          && Equal.equals(model.maybeScan, s.own.camera === 'Available' ? Opt.some(Msg.ScanRequested()) : Opt.none())
      })
    })

    test('while adding from the first step, tells whether the scanner was offered, so that the step is drawn as it was', () => {
      assertProperty([submitting], (s) => {
        const model = makeModel(s)
        return model._tag === 'Adding'
          && (model.step._tag !== 'Naming' || model.step.canScan === (s.own.camera === 'Available'))
      })
    })

    // The scanner rises over the first step and the date step covers it: neither draws the fridge.
    test('shows the fridge on the first step, while it takes input and while it adds, away during a lookup, and nowhere else', () => {
      assertProperty([state], (s) => {
        const model = makeModel(s)
        const shown = model._tag === 'Naming' || model._tag === 'LookingUp'
          ? Opt.some(model.fridge)
          : model._tag === 'Adding' && model.step._tag === 'Naming'
          ? Opt.some(model.step.fridge)
          : Opt.none()
        const { phase } = s.own
        const expected = phase._tag === 'Naming' || (phase._tag === 'Submitting' && phase.from === 'Naming')
          ? Opt.some(Fridge.program.makeModel(fridgeOf(s)))
          : phase._tag === 'LookingUp'
          ? Opt.some<Fridge.Model>({ _tag: 'Away' })
          : Opt.none()
        return Equal.equals(shown, expected)
      })
    })

    test('shows the date as the child draws it, with the number of its instance, exactly while the second step is shown', () => {
      assertProperty([state], (s) => {
        const model = makeModel(s)
        const shown = model._tag === 'Dating'
          ? Opt.some(model.expiration)
          : model._tag === 'Adding' && model.step._tag === 'Dating'
          ? Opt.some(model.step.expiration)
          : Opt.none()
        return showsDate(s) === Opt.isSome(dateOf(s))
          && Equal.equals(
            shown,
            Opt.map(s.children.Expiration, ({ instance, state }) => ({
              instance,
              model: Expiration.program.makeModel(state),
            })),
          )
      })
    })

    test('waits for the lookup exactly while it goes on, offering only to cancel it and to close', () => {
      assertProperty([state], (s) => {
        const model = makeModel(s)
        const { phase } = s.own
        return phase._tag === 'LookingUp'
          ? Equal.equals(model, {
            _tag: 'LookingUp',
            keyboardInset: s.own.keyboardInset,
            supporting: { _tag: 'LookingUp', barcode: phase.barcode },
            name: nameOf(s),
            nameKey: s.own.replacements,
            snackbar: Snackbar.makeModel(snackbarOf(s).state),
            close: Msg.Closed(),
            cancelLookup: Msg.LookupCancelled(),
            fridge: { _tag: 'Away' },
          })
          : model._tag !== 'LookingUp'
      })
    })

    test('every state draws how far the page keeps clear of the keyboard', () => {
      assertProperty([state], (s) => makeModel(s).keyboardInset === s.own.keyboardInset)
    })

    test('every state shows the name, drawn anew with each replacement, and the snackbar standing; the scanner the camera', () => {
      assertProperty([state], (s) => {
        const model = makeModel(s)
        return model.name === nameOf(s)
          && model.nameKey === s.own.replacements
          && Equal.equals(model.snackbar, Snackbar.makeModel(snackbarOf(s).state))
          && (model._tag !== 'Scanning' || model.camera === s.own.camera)
          && (model._tag !== 'Dating' || model.name === nameOf(s))
      })
    })

    // A lookup's text comes from a scan, which needs the camera: it wins when the camera failed on a later opening.
    test('the name\'s supporting text says what the lookup found, or else that the camera is unavailable, in every state', () => {
      assertProperty([state], (s) => {
        const { lookup, camera, phase } = s.own
        const expected = phase._tag === 'LookingUp'
          ? { _tag: 'LookingUp', barcode: phase.barcode }
          : lookup._tag === 'Found'
          ? { _tag: 'FromOpenFoodFacts', open: Msg.LinkPressed({ url: lookup.url }) }
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

    test('is data: equal states, built apart, have equal models', () => {
      fc.assert(fc.property(fc.integer(), (seed) => {
        const [one] = fc.sample(state, { seed, numRuns: 1 })
        const [other] = fc.sample(state, { seed, numRuns: 1 })
        if (one === undefined || other === undefined) throw new Error('nothing sampled')
        expect(one).not.toBe(other)
        expect(Equal.equals(makeModel(one), makeModel(other))).toBe(true)
      }))
    })
  })

  describe('Completed', () => {
    // The second step leaves with its own transition.
    test('success starts the next product at the name, this one\'s kept in the same field, forgets the date, sends the product into the fridge on the day of the clock, and vibrates', () => {
      assertProperty([submitting], (before) => {
        if (before.own.phase._tag !== 'Submitting') return false
        const { product } = before.own.phase
        const today = Day.fromDateTime(Opt.getOrThrow(before.own.maybeNow))
        const { after, commands } = step(Msg.Completed({ succeeded: true }), before)
        return Equal.equals(after.own, withOwn(before, { phase: { _tag: 'Naming' } }))
          && Opt.isNone(after.children.Expiration)
          && Equal.equals(
            fridgeOf(after),
            Fridge.program.external({ _tag: 'Admitted', product, today })(fridgeOf(before)).state,
          )
          && Equal.equals(commands, [Cmd.Vibrate({ feedback: 'Confirm' })])
      })
    })

    test('failure gives the step back, the date with its digits, unlocked, and says so with a snackbar and a vibration', () => {
      assertProperty([submitting], (before) => {
        if (before.own.phase._tag !== 'Submitting') return false
        const { from } = before.own.phase
        const { after, commands } = step(Msg.Completed({ succeeded: false }), before)
        const { instance, state: snackbar } = snackbarOf(before)
        return Equal.equals(after.own, withOwn(before, { phase: { _tag: from } }))
          && Equal.equals(
            dateOf(after),
            Opt.map(dateOf(before), (date) => ({ ...date, page: { ...date.page, isLocked: false } })),
          )
          && Equal.equals(Snackbar.output(snackbarOf(after).state), Opt.some<Failure>('AddFailed'))
          && Equal.equals(commands, [
            Cmd.Vibrate({ feedback: 'Reject' }),
            { _tag: 'Snackbar', instance, command: { _tag: 'Stamp', id: snackbar.told, lasting: 'Short' } },
          ])
      })
    })
  })

  // The date's setting answers its own command: a failure to keep the order is the page's to tell.
  describe('the date\'s OrderNotKept', () => {
    const keptAnswer = (s: Whole, succeeded: boolean): Message => ({
      _tag: 'Expiration',
      instance: Opt.getOrThrow(s.children.Expiration).instance,
      message: { _tag: 'OrderKept', succeeded },
    })

    test('says so with a snackbar and a vibration, wherever the date is shown', () => {
      assertProperty([fc.oneof(dating, submitting)], (before) => {
        fc.pre(showsDate(before))
        const { after, commands } = step(keptAnswer(before, false), before)
        const { instance, state: snackbar } = snackbarOf(before)
        return Equal.equals(after.own, before.own)
          && Equal.equals(Snackbar.output(snackbarOf(after).state), Opt.some<Failure>('OrderNotKept'))
          && Equal.equals(commands, [
            Cmd.Vibrate({ feedback: 'Reject' }),
            { _tag: 'Snackbar', instance, command: { _tag: 'Stamp', id: snackbar.told, lasting: 'Short' } },
          ])
      })
    })

    test('an order kept tells nothing', () => {
      assertProperty([fc.oneof(dating, submitting)], (before) => {
        fc.pre(showsDate(before))
        const { after, commands, events } = step(keptAnswer(before, true), before)
        return Equal.equals(after, before) && commands.length === 0 && events.length === 0
      })
    })
  })

  test('Closed asks the parent to leave the page on the first step, the lookup going on or not, and is rejected otherwise', () => {
    assertProperty([state], (before) => {
      const { phase } = before.own
      if (phase._tag !== 'Naming' && phase._tag !== 'LookingUp') return rejects(Msg.Closed(), before)
      const { after, commands, events } = step(Msg.Closed(), before)
      return Equal.equals(after, before) && commands.length === 0 && Equal.equals(events, [Ev.LeaveRequested()])
    })
  })

  test('the back button, which the root tells, leaves the page, closes the scanner or the second step first, and is held while adding', () => {
    assertProperty([state], (before) => {
      const { phase } = before.own
      const { state: after, commands, events } = applyAll(program.external, [{ _tag: 'BackPressed' }], before)
      const expected = phase._tag === 'Naming' || phase._tag === 'LookingUp'
        ? { own: before.own, events: [Ev.LeaveRequested()] }
        : phase._tag === 'Scanning' || phase._tag === 'Dating'
        ? { own: withOwn(before, { phase: { _tag: 'Naming' } }), events: [] }
        : { own: before.own, events: [] }
      return Equal.equals(after.own, expected.own) && commands.length === 0 && Equal.equals(events, expected.events)
    })
  })

  // A tap of a frame drawn for an earlier visit of the second step names the date that was there.
  test('a message of the date for another instance than the one that is there is rejected', () => {
    assertProperty([dating], (before) => {
      const { instance } = Opt.getOrThrow(before.children.Expiration)
      return rejects(toDate(instance + 1)({ _tag: 'DigitTyped', digit: '1' }), before)
        && rejects(toDate(instance + 1)({ _tag: 'DateCleared' }), before)
    })
  })
})

// The back button is the root's, which tells the page each press.
test('the page listens to the clock and the keyboard, to the camera while the scanner is open until it fails, to the lookup of the barcode it looks up, and to its children\'s: the snackbar, the fridge, and the date while it is shown', () => {
  assertProperty([state], (s) => {
    const keys = program.subscriptions(s)
    const has = (key: Tea.KeyOf<typeof program>) => keys.some((listed) => Equal.equals(listed, key))
    const { phase } = s.own
    const lookups = keys.filter((key) => typeof key === 'object' && key._tag === 'Lookup')
    const ofChild = <K>(
      name: 'Snackbar' | 'Fridge' | 'Expiration',
      maybe: Opt.Option<Readonly<{ instance: number }>>,
      childKeys: ReadonlyArray<K>,
    ) =>
      Opt.match(maybe, {
        onNone: () => !keys.some((key) => typeof key === 'object' && key._tag === name),
        onSome: ({ instance }) =>
          childKeys.every((key) => keys.some((listed) => Equal.equals(listed, { _tag: name, instance, key }))),
      })
    const snackbar = snackbarOf(s)
    const fridge = Opt.getOrThrow(s.children.Fridge)
    return has('clock') && has('keyboard')
      && has('scanner') === readsCamera(s)
      && Equal.equals(lookups, phase._tag === 'LookingUp' ? [{ _tag: 'Lookup', barcode: phase.barcode }] : [])
      && ofChild('Snackbar', Opt.some(snackbar), Snackbar.subscriptions(snackbar.state))
      && ofChild('Fridge', Opt.some(fridge), Fridge.program.subscriptions(fridge.state))
      && ofChild(
        'Expiration',
        s.children.Expiration,
        Opt.match(dateOf(s), { onNone: () => [], onSome: Expiration.program.subscriptions }),
      )
  })
})

describe('the lookup', () => {
  const code = '8076800195057'

  /** The messages the lookup's subscription sends, and the one it ends with, on a service that answers `answer`. */
  const endsWith = async (answer: Effect.Effect<Opt.Option<FoundProduct>, ProductLookupError>) => {
    // Typed with every service of the page, of which it reads the lookup's only.
    const subscription = program.listen({ _tag: 'Lookup', barcode: code }) as Tea.Subscription<Message, ProductLookup>
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
