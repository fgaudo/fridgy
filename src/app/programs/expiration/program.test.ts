import { describe, expect, test } from 'bun:test'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as References from 'effect/References'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'
import * as fc from 'fast-check'
import { arbitrary as product } from '#domain/product.test_arbitrary.ts'
import * as Product from '#domain/product.ts'
import { DateOrderStore, DateOrderWriteError } from '#infrastructure/storage/date-order.ts'
import { arbitrary as order } from '#libs/dates/date-order.test_arbitrary.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import { arbitrary as anyDay } from '#libs/dates/day.test_arbitrary.ts'
import * as Day from '#libs/dates/day.ts'
import * as DigitDateEntry from '#libs/dates/digit-date-entry.ts'
import * as DigitDates from '#libs/dates/digit-dates.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { fromStream } from '#libs/source/source.ts'
import { messagesSentBy } from '#libs/tea-react/view.test_support.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import { concludingNever, concludingOn, digit, external, message, state, undecided } from './program.test_arbitrary.ts'
import {
  type Command,
  type Digit,
  type Event,
  type Message,
  type Model,
  type Output,
  program,
  type State,
} from './program.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()
const Ev = Data.taggedEnum<Event>()
const Out = Data.taggedEnum<Output>()

const { outcome, rejects, step } = outcomesOf(program.update)

const { makeModel } = program

const digits: ReadonlyArray<Digit> = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

const storedDate = (s: State) => Opt.flatMap(s.maybeStored, (stored) => stored.maybeExpirationDate)

/** The entry the field shows: the stored date's digits in the order in use, until a key is pressed. */
const entryShown = (s: State): DigitDateEntry.Entry =>
  s.date._tag === 'Typed' ? s.date.entry : {
    digits: Opt.match(Opt.all([storedDate(s), s.maybeOrder]), {
      onNone: () => '',
      onSome: ([date, order]) => DigitDates.digitsOf(date, order),
    }),
    maybeChosenDate: Opt.none(),
  }

/** The days a product may expire on: one to be, from today; a stored one, as the domain lets it be edited. */
const allows = (s: State, now: DateTime.Zoned) =>
  Opt.match(s.maybeStored, {
    onNone: () => Product.canExpireOn(now),
    onSome: (stored) => Product.canBeEditedToExpireOn(stored, now.zone),
  })

/** The days the digits name, read in the order in use from the time the page told, that the product may expire on. */
const offeredDates = (s: State): ReadonlyArray<Day.Day> =>
  Opt.match(Opt.all([s.page.maybeNow, s.maybeOrder]), {
    onNone: () => [],
    onSome: ([now, order]) => DigitDateEntry.offered(entryShown(s), Day.fromDateTime(now), order, allows(s, now)),
  })

/** Whether more digits typed after those shown can name a day the product may expire on. */
const canCompleteDate = (s: State) =>
  Opt.match(Opt.all([s.page.maybeNow, s.maybeOrder]), {
    onNone: () => false,
    onSome: ([now, order]) => DigitDateEntry.canComplete(entryShown(s), Day.fromDateTime(now), order, allows(s, now)),
  })

const namedDate = (s: State) => DigitDateEntry.named(entryShown(s), offeredDates(s))

/** Whether the keypad, the chips and the segments take a press: the form unlocked, the order known. */
const takesInput = (s: State) => !s.page.isLocked && Opt.isSome(s.maybeOrder)

const withEntry = (s: State, entry: DigitDateEntry.Entry): State => ({ ...s, date: { _tag: 'Typed', entry } })

const taking = state.filter(takesInput)

const notTaking = state.filter((s) => !takesInput(s))

const locked = state.filter((s) => s.page.isLocked)

/** The messages of the view, any day among them. */
const ofTheView = (date: Day.Day, picked: DateOrder.DateOrder): ReadonlyArray<Message> => [
  ...digits.map((digit) => Msg.DigitTyped({ digit })),
  Msg.DigitErased(),
  Msg.DateCleared(),
  Msg.DateChosen({ date }),
  Msg.OrderPicked({ order: picked }),
]

describe('Expiration update', () => {
  // Nothing rules a message out: what the view, the setting and the command send may arrive in any state.
  test('answers every message in every state, the same way each time, with no defect', () => {
    assertProperty([state, message], (before, msg) => Equal.equals(outcome(msg, before), outcome(msg, before)))
  })

  // The digit keys and the backspace are meant to repeat.
  test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
    fc.assert(fc.property(state, anyDay, (before, date) => {
      const candidates = [
        ...digits.map((digit) => Msg.DigitTyped({ digit })),
        Msg.DigitErased(),
        Msg.DateCleared(),
        ...[date, ...offeredDates(before)].map((day) => Msg.DateChosen({ date: day })),
        ...DateOrder.all.map((order) => Msg.OrderPicked({ order })),
      ]
      expect(dispatchViolations(program.update, {
        state: before,
        held: messagesSentBy<Model, Message>(view, makeModel(before)),
        candidates,
        repeatable: (msg) => msg._tag === 'DigitTyped' || msg._tag === 'DigitErased',
      })).toEqual([])
    }))
  })

  test('starts locked, with no time and no order, the stored date kept', () => {
    assertProperty([maybe(product)], (maybeStored) =>
      Equal.equals(program.init({ maybeStored }), {
        state: {
          maybeStored,
          page: { maybeNow: Opt.none(), isLocked: true },
          maybeOrder: Opt.none(),
          date: { _tag: 'Kept' },
        },
      }))
  })

  describe('the keypad', () => {
    test('types a digit after those shown, up to the longest date, and forgets the day picked', () => {
      assertProperty([taking, digit], (before, typed) => {
        const shown = entryShown(before).digits
        return shown.length >= DigitDates.MAX_DIGITS
          ? rejects(Msg.DigitTyped({ digit: typed }), before)
          : Equal.equals(step(Msg.DigitTyped({ digit: typed }), before), {
            rejected: false,
            after: withEntry(before, { digits: shown + typed, maybeChosenDate: Opt.none() }),
            commands: [],
            events: [],
          })
      })
    })

    test('erases the last digit shown and forgets the day picked, or is rejected when there is no digit', () => {
      assertProperty([taking], (before) => {
        const shown = entryShown(before).digits
        return shown === ''
          ? rejects(Msg.DigitErased(), before)
          : Equal.equals(
            step(Msg.DigitErased(), before).after,
            withEntry(before, { digits: shown.slice(0, -1), maybeChosenDate: Opt.none() }),
          )
      })
    })

    test('clears every digit shown and forgets the day picked, or is rejected when there is no digit', () => {
      assertProperty([taking], (before) =>
        entryShown(before).digits === ''
          ? rejects(Msg.DateCleared(), before)
          : Equal.equals(step(Msg.DateCleared(), before).after, withEntry(before, DigitDateEntry.empty)))
    })

    // A stored date is a date's longest: its digits take no more.
    test('a digit on the untouched stored date is rejected; the backspace erases its last digit', () => {
      assertProperty([taking, digit], (before, typed) => {
        fc.pre(before.date._tag === 'Kept' && Opt.isSome(storedDate(before)))
        const shown = entryShown(before).digits
        return shown.length === DigitDates.MAX_DIGITS && rejects(Msg.DigitTyped({ digit: typed }), before)
          && Equal.equals(
            step(Msg.DigitErased(), before).after,
            withEntry(before, { digits: shown.slice(0, -1), maybeChosenDate: Opt.none() }),
          )
      })
    })

    test('is rejected while the page\'s form is locked, and until the order is known', () => {
      assertProperty(
        [notTaking, digit],
        (before, typed) =>
          rejects(Msg.DigitTyped({ digit: typed }), before) && rejects(Msg.DigitErased(), before)
          && rejects(Msg.DateCleared(), before),
      )
    })
  })

  describe('DateChosen', () => {
    test('picks a day the digits name, unless the date already names it, and is rejected on any other day', () => {
      assertProperty([taking, anyDay], (before, other) => {
        const offered = offeredDates(before)
        return [...offered, other].every((date) => {
          const msg = Msg.DateChosen({ date })
          return offered.includes(date) && !Opt.contains(namedDate(before), date)
            ? Equal.equals(
              step(msg, before).after,
              withEntry(before, { ...entryShown(before), maybeChosenDate: Opt.some(date) }),
            )
            : rejects(msg, before)
        })
      })
    })

    test('is rejected while the page\'s form is locked, and until the order is known', () => {
      assertProperty([notTaking, anyDay], (before, date) => rejects(Msg.DateChosen({ date }), before))
    })
  })

  // The pick applies at once, and is kept in the setting, which reports it back.
  test('OrderPicked takes another order than the one in use and keeps it, while the date takes input, and is rejected otherwise', () => {
    assertProperty([state, order], (before, picked) =>
      takesInput(before) && !Opt.contains(before.maybeOrder, picked)
        ? Equal.equals(step(Msg.OrderPicked({ order: picked }), before), {
          rejected: false,
          after: { ...before, maybeOrder: Opt.some(picked) },
          commands: [Cmd.KeepOrder({ order: picked })],
          events: [],
        })
        : rejects(Msg.OrderPicked({ order: picked }), before))
  })

  test('OrderChanged keeps the order, in any state, and leaves the very same state on the order in use', () => {
    assertProperty([state, order], (before, changed) => {
      const result = step(Msg.OrderChanged({ order: changed }), before)
      return Opt.contains(before.maybeOrder, changed)
        ? result.after === before
        : Equal.equals(result, {
          rejected: false,
          after: { ...before, maybeOrder: Opt.some(changed) },
          commands: [],
          events: [],
        })
    })
  })

  test('OrderKept changes nothing, and tells the page when the order could not be kept, in any state', () => {
    assertProperty(
      [state, fc.boolean()],
      (before, succeeded) =>
        Equal.equals(step(Msg.OrderKept({ succeeded }), before), {
          rejected: false,
          after: before,
          commands: [],
          events: succeeded ? [] : [Ev.OrderNotKept()],
        }),
    )
  })
})

describe('what the page tells', () => {
  test('PageChanged keeps the time and the lock it is told, in any state', () => {
    assertProperty([state, external], (before, told) =>
      Equal.equals(program.external(told)(before), {
        state: { ...before, page: { maybeNow: told.maybeNow, isLocked: told.isLocked } },
      }))
  })

  test('a locked date rejects every message of the view, and still takes the order reported and the end of its keeping', () => {
    assertProperty(
      [locked, anyDay, order, fc.boolean()],
      (before, date, picked, succeeded) =>
        ofTheView(date, picked).every((msg) => rejects(msg, before))
        && !rejects(Msg.OrderChanged({ order: picked }), before)
        && !rejects(Msg.OrderKept({ succeeded }), before),
    )
  })
})

describe('the output', () => {
  // It is not read from the digits: the order may not be known yet, and the stored date need not be allowed.
  test('the stored date stands while kept, whatever the order, and a product with none never expires', () => {
    assertProperty([state], (s) => {
      fc.pre(s.date._tag === 'Kept')
      return Equal.equals(
        program.output(s),
        Opt.match(storedDate(s), { onNone: () => Out.Never(), onSome: (day) => Out.On({ day }) }),
      )
    })
  })

  test('typed, no digits never expire, digits that name one allowed day or a picked one are on it, and the others are undecided', () => {
    assertProperty([state], (s) => {
      fc.pre(s.date._tag === 'Typed')
      return Equal.equals(
        program.output(s),
        entryShown(s).digits === ''
          ? Out.Never()
          : Opt.match(namedDate(s), { onNone: () => Out.Undecided(), onSome: (day) => Out.On({ day }) }),
      )
    })
  })

  test('the arbitraries of each conclusion conclude it', () => {
    assertProperty([concludingOn], (s) => program.output(s)._tag === 'On')
    assertProperty([undecided], (s) => program.output(s)._tag === 'Undecided')
    assertProperty([concludingNever], (s) => program.output(s)._tag === 'Never')
  })
})

describe('the date order', () => {
  test('is listened to in every state', () => {
    assertProperty([state], (s) => Equal.equals(program.subscriptions(s), ['date-order']))
  })

  test('is heard as the setting reports it', async () => {
    const heard = await Effect.runPromise(
      Effect.gen(function*() {
        const sent: Array<Message> = []
        yield* Effect.forkChild(
          Channel.runForEach(program.listen('date-order'), (msg) => Effect.sync(() => sent.push(msg))),
        )
        yield* Effect.yieldNow
        return sent
      }).pipe(Effect.provideService(DateOrderStore, {
        changes: fromStream(Stream.fromIterable<DateOrder.DateOrder>(['DMY', 'YMD'])),
        set: () => Effect.void,
      })),
    )
    expect(heard).toEqual([Msg.OrderChanged({ order: 'DMY' }), Msg.OrderChanged({ order: 'YMD' })])
  })

  test('is kept by KeepOrder, which tells whether it could be', async () => {
    const kept: Array<DateOrder.DateOrder> = []
    const keep = (set: (order: DateOrder.DateOrder) => Effect.Effect<void, DateOrderWriteError>) =>
      Effect.runPromise(
        program.runCommand(Cmd.KeepOrder({ order: 'MDY' })).pipe(
          Effect.provideService(DateOrderStore, { changes: Channel.never, set }),
          Effect.provideService(References.MinimumLogLevel, 'None'),
        ),
      )
    expect(await keep((order) => Effect.sync(() => kept.push(order)))).toEqual(
      Opt.some(Msg.OrderKept({ succeeded: true })),
    )
    expect(kept).toEqual(['MDY'])
    expect(await keep(() => Effect.fail(new DateOrderWriteError({ cause: 'full' })))).toEqual(
      Opt.some(Msg.OrderKept({ succeeded: false })),
    )
  })
})

// Guards against the properties above passing only on a few cases.
test('the arbitrary states cover every case', () => {
  const states = fc.sample(state, 2_000)
  const models = states.map(makeModel)
  const choices = models.flatMap((model) => model.strip._tag === 'Naming' ? model.strip.choices : [])
  expect(states.some((s) => Opt.isNone(s.maybeStored))).toBe(true)
  expect(states.some((s) => Opt.isSome(storedDate(s)))).toBe(true)
  expect(states.some((s) => Opt.isSome(s.maybeStored) && Opt.isNone(storedDate(s)))).toBe(true)
  expect(states.some((s) => Opt.isNone(s.maybeOrder))).toBe(true)
  expect(states.some((s) => Opt.isNone(s.page.maybeNow))).toBe(true)
  expect(states.some((s) => s.page.isLocked)).toBe(true)
  expect(states.some((s) => takesInput(s))).toBe(true)
  expect(states.some((s) => s.date._tag === 'Kept' && Opt.isSome(storedDate(s)) && takesInput(s))).toBe(true)
  expect(states.some((s) => s.date._tag === 'Typed' && Opt.isSome(s.maybeStored))).toBe(true)
  expect(states.some((s) => s.date._tag === 'Typed' && Opt.isNone(s.maybeStored))).toBe(true)
  expect(models.some((model) => model.strip._tag === 'Hint')).toBe(true)
  expect(models.some((model) => model.strip._tag === 'NamingNothing')).toBe(true)
  expect(choices.some((choice) => choice.choice._tag === 'Chosen')).toBe(true)
  expect(choices.some((choice) => choice.choice._tag === 'Offered' && Opt.isSome(choice.choice.maybeChoose)))
    .toBe(true)
  expect(states.some((s) => program.output(s)._tag === 'On')).toBe(true)
  expect(states.some((s) => program.output(s)._tag === 'Never')).toBe(true)
  expect(states.some((s) => program.output(s)._tag === 'Undecided')).toBe(true)
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

  // The row of the segments stays empty until then: nothing moves as the order arrives.
  test('shows the order unknown until it is, then the order in use with the others to pick, exactly while update accepts them', () => {
    assertProperty([state], (s) =>
      Equal.equals(
        makeModel(s).order,
        Opt.match(s.maybeOrder, {
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
        }),
      ))
  })

  // The digits of the stored date name its day alone, which is the day named.
  test('shows the untouched stored date as its digits in the order in use, its one chip chosen, once the time and the order are known', () => {
    assertProperty([state, order], (s, other) => {
      fc.pre(s.date._tag === 'Kept' && Opt.isSome(s.maybeOrder) && Opt.isSome(s.page.maybeNow))
      const shownIn = (s: State) => {
        const model = makeModel(s)
        return Opt.match(Opt.all([storedDate(s), s.maybeOrder]), {
          onNone: () => model.digits === '' && model.strip._tag === 'Hint',
          onSome: ([date, order]) =>
            model.digits === DigitDates.digitsOf(date, order)
            && Equal.equals(model.strip, { _tag: 'Naming', choices: [{ date, choice: { _tag: 'Chosen' } }] }),
        })
      }
      return shownIn(s) && shownIn({ ...s, maybeOrder: Opt.some(other) })
    })
  })

  test('shows no digits and the hint until the order is known', () => {
    assertProperty([state], (s) => {
      fc.pre(Opt.isNone(s.maybeOrder))
      const model = makeModel(s)
      return model.digits === '' && model.strip._tag === 'Hint'
    })
  })

  // The days can be picked only while the date takes input.
  test('shows the digits as typed; the strip the hint while they name no day yet, the days they name with the one named, or that no more digits can name one', () => {
    assertProperty([state], (s) => {
      fc.pre(s.date._tag === 'Typed')
      const model = makeModel(s)
      const offered = offeredDates(s)
      const entry = entryShown(s)
      const expected = offered.length === 0
        ? entry.digits === '' || canCompleteDate(s) ? { _tag: 'Hint' } : { _tag: 'NamingNothing' }
        : {
          _tag: 'Naming',
          choices: offered.map((date) => ({
            date,
            choice: Opt.contains(namedDate(s), date)
              ? { _tag: 'Chosen' }
              : { _tag: 'Offered', maybeChoose: takesInput(s) ? Opt.some(Msg.DateChosen({ date })) : Opt.none() },
          })),
        }
      return model.digits === entry.digits && Equal.equals(model.strip, expected)
    })
  })

  test('holds no keys while the page\'s form is locked; otherwise each key exactly where its rule applies, once the order is known', () => {
    assertProperty([state, digit], (s, typed) => {
      const { maybeKeys } = makeModel(s)
      if (s.page.isLocked) return Opt.isNone(maybeKeys)
      const entry = entryShown(s)
      const where = <A>(maybe: Opt.Option<A>, msg: Message) =>
        Opt.isSome(s.maybeOrder) ? Opt.map(maybe, () => msg) : Opt.none()
      return Opt.exists(maybeKeys, (keys) =>
        Equal.equals(
          Opt.map(keys.maybeTypeDigit, (type) => type[typed]),
          where(DigitDateEntry.typeDigit(typed)(entry), Msg.DigitTyped({ digit: typed })),
        )
        && Equal.equals(keys.maybeEraseDigit, where(DigitDateEntry.eraseDigit(entry), Msg.DigitErased()))
        && Equal.equals(keys.maybeClearDate, where(DigitDateEntry.clear(entry), Msg.DateCleared())))
    })
  })

  test('draws nothing to press while the page\'s form is locked', () => {
    assertProperty([locked], (s) => messagesSentBy<Model, Message>(view, makeModel(s)).length === 0)
  })

  describe('on a product', () => {
    const creationDate = DateTime.makeZonedUnsafe('2026-10-20T10:00:00Z', { timeZone: 'Europe/Rome' })
    const now = DateTime.makeZonedUnsafe('2026-10-28T12:00:00Z', { timeZone: 'Europe/Rome' })
    const day = Schema.decodeSync(Day.Schema)
    const milk = Opt.getOrThrow(
      Product.make({ name: 'Milk', creationDate, maybeExpirationDate: Opt.some(day('2026-11-05')) }),
    )
    const opened: State = {
      maybeStored: Opt.some(milk),
      page: { maybeNow: Opt.some(now), isLocked: false },
      maybeOrder: Opt.some('DMY'),
      date: { _tag: 'Kept' },
    }
    const typed = (digits: string, from: State = opened): State =>
      withEntry(from, { digits, maybeChosenDate: Opt.none() })
    const toBe: State = { ...opened, maybeStored: Opt.none() }
    const strip = (s: State) => makeModel(s).strip

    // A day typed with its year may be past: a typo corrected, or a product bought past its date.
    test('offers a stored product a day between the creation day and today, and never a day before the creation day', () => {
      expect(strip(typed('22102026'))).toEqual({
        _tag: 'Naming',
        choices: [{ date: day('2026-10-22'), choice: { _tag: 'Chosen' } }],
      })
      expect(strip(typed('20102026'))._tag).toBe('Naming')
      expect(strip(typed('19102026'))).toEqual({ _tag: 'NamingNothing' })
    })

    test('offers a product to be today and the days after, and never a day before today', () => {
      expect(strip(typed('28102026', toBe))).toEqual({
        _tag: 'Naming',
        choices: [{ date: day('2026-10-28'), choice: { _tag: 'Chosen' } }],
      })
      expect(strip(typed('27102026', toBe))).toEqual({ _tag: 'NamingNothing' })
      expect(program.output(typed('28102026', toBe))).toEqual(Out.On({ day: day('2026-10-28') }))
    })

    // Typing a date with its year, the fifth to the seventh digit name no day: a year of one or three digits, or
    // one of two already past.
    test('shows the hint while more digits can name a day, and that the digits name none once none can', () => {
      expect(strip(typed('06112'))).toEqual({ _tag: 'Hint' })
      expect(strip(typed('061120'))).toEqual({ _tag: 'Hint' })
      expect(strip(typed('0611202'))).toEqual({ _tag: 'Hint' })
      expect(strip(typed('0611201'))).toEqual({ _tag: 'NamingNothing' })
      expect(strip(typed('00'))).toEqual({ _tag: 'NamingNothing' })
    })

    test('rewrites the untouched stored date in another order, and leaves typed digits as typed', () => {
      expect(makeModel({ ...opened, maybeOrder: Opt.some('MDY') }).digits).toBe('11052026')
      expect(makeModel({ ...typed('0511'), maybeOrder: Opt.some('MDY') }).digits).toBe('0511')
    })

    test('concludes on the stored date while untouched, whatever the order, and never once its digits are cleared', () => {
      expect(program.output(opened)).toEqual(Out.On({ day: day('2026-11-05') }))
      expect(program.output({ ...opened, maybeOrder: Opt.none() })).toEqual(Out.On({ day: day('2026-11-05') }))
      expect(program.output(typed(''))).toEqual(Out.Never())
      expect(program.output(typed('0611'))).toEqual(Out.On({ day: day('2026-11-06') }))
      expect(program.output(typed('061120'))).toEqual(Out.Undecided())
    })
  })
})
