import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as TestClock from 'effect/testing/TestClock'
import * as fc from 'fast-check'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import { lasting, none, standing, state as stateOf } from './program.test_arbitrary.ts'
import { type Command, type Event, type External, type Key, type Message, make, type State } from './program.ts'

/** The notices of this test's own parent. */
type Notice = 'SaveFailed' | 'Undo'

const Snackbar = make<Notice>()

const notice: fc.Arbitrary<Notice> = fc.constantFrom('SaveFailed', 'Undo')

const state = stateOf(notice)

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()
const Ev = Data.taggedEnum<Event<Notice>>()
const Ext = Data.taggedEnum<External<Notice>>()
const KeyOf = Data.taggedEnum<Key>()

const { rejects, step } = outcomesOf(Snackbar.update)

const told = (s: State<Notice>, message: External<Notice>) => Snackbar.external(message)(s)

/** The id of the snackbar standing, if any. */
const idOf = (s: State<Notice>) => Opt.map(s.maybeStanding, ({ id }) => id)

describe('Snackbar', () => {
  // It has no view: its parents draw its model. No message of the snackbar's own is the user's.
  test('holds no message for a view, and none is missing', () => {
    assertProperty([state], (s) => dispatchViolations(Snackbar.update, { state: s, held: [] }).length === 0)
  })

  test('starts with none told and none standing', () => {
    expect(Snackbar.init).toEqual({ state: { told: 0, maybeStanding: Opt.none() } })
  })

  test('Told shows the notice with the next id, alone or after the one standing, and asks for the time it was told', () => {
    assertProperty(
      [state, notice, lasting],
      (before, shown, lasts) =>
        Equal.equals(told(before, Ext.Told({ notice: shown, lasting: lasts })), {
          state: {
            told: before.told + 1,
            maybeStanding: Opt.some({
              id: before.told,
              notice: shown,
              entrance: Opt.isSome(before.maybeStanding) ? 'AfterAnother' : 'Alone',
              maybeUntil: Opt.none(),
            }),
          },
          commands: [Cmd.Stamp({ id: before.told, lasting: lasts })],
        }),
    )
  })

  // A message of a snackbar names it by its id: one told later never takes what was meant for another.
  test('never gives an id twice', () => {
    const tell = fc.oneof(
      fc.tuple(notice, lasting).map(([notice, lasting]) => Ext.Told({ notice, lasting })),
      fc.constant(Ext.Dismissed()),
    )
    assertProperty([fc.array(tell, { maxLength: 20 })], (tells) => {
      const ids: Array<number> = []
      tells.reduce((s: State<Notice>, message) => {
        const after = told(s, message).state
        if (message._tag === 'Told') Opt.map(idOf(after), (id) => ids.push(id))
        return after
      }, Snackbar.init.state)
      return new Set(ids).size === ids.length
    })
  })

  test('Dismissed takes the snackbar standing away, telling nothing, and leaves the very same state with none', () => {
    assertProperty([state], (before) => {
      const result = told(before, Ext.Dismissed())
      return Opt.isNone(before.maybeStanding)
        ? result.state === before && result.commands === undefined
        : Equal.equals(result, { state: { ...before, maybeStanding: Opt.none() } })
    })
  })

  describe('Stamped', () => {
    test('sets when the snackbar standing leaves', () => {
      assertProperty(
        [standing(notice), utc],
        (before, until) =>
          Opt.exists(before.maybeStanding, (shown) =>
            Equal.equals(step(Msg.Stamped({ id: shown.id, until }), before), {
              rejected: false,
              after: { ...before, maybeStanding: Opt.some({ ...shown, maybeUntil: Opt.some(until) }) },
              commands: [],
              events: [],
            })),
      )
    })

    // A command cannot be cancelled: the stamp of a snackbar replaced or dismissed since arrives late.
    test('is rejected for a snackbar replaced or dismissed', () => {
      assertProperty([state, fc.nat({ max: 30 }), utc], (before, id, until) => {
        fc.pre(!Opt.contains(idOf(before), id))
        return rejects(Msg.Stamped({ id, until }), before)
      })
    })
  })

  describe('Expired', () => {
    test('takes the snackbar standing away, and tells its notice', () => {
      assertProperty(
        [standing(notice)],
        (before) =>
          Opt.exists(before.maybeStanding, (shown) =>
            Equal.equals(step(Msg.Expired({ id: shown.id }), before), {
              rejected: false,
              after: { ...before, maybeStanding: Opt.none() },
              commands: [],
              events: [Ev.Expired({ notice: shown.notice })],
            })),
      )
    })

    // Its timer runs only while a snackbar stands, keyed by its id: what it sends after its key went away is lost.
    test('is a defect with no snackbar standing, or for another one', () => {
      assertProperty([state, fc.nat({ max: 30 })], (before, id) => {
        fc.pre(!Opt.contains(idOf(before), id))
        expect(() => Snackbar.update(Msg.Expired({ id }))(before)).toThrow(Tea.InvariantDefect)
        return true
      })
    })
  })

  test('times the snackbar standing once it is stamped, by its id and when it leaves', () => {
    assertProperty([state], (s) =>
      Equal.equals(
        Snackbar.subscriptions(s),
        Opt.match(s.maybeStanding, {
          onNone: () => [],
          onSome: ({ id, maybeUntil }) =>
            Opt.match(maybeUntil, { onNone: () => [], onSome: (until) => [KeyOf.Standing({ id, until })] }),
        }),
      ))
  })

  test('gives its parent the notice standing', () => {
    assertProperty([state], (s) => Equal.equals(Snackbar.output(s), Opt.map(s.maybeStanding, ({ notice }) => notice)))
  })

  test('draws the notice standing, with its id and how it entered', () => {
    assertProperty([state], (s) =>
      Equal.equals(
        Snackbar.makeModel(s),
        Opt.map(s.maybeStanding, ({ id, notice, entrance }) => ({ id, notice, entrance })),
      ))
  })

  test('is data: equal states, built apart, have equal models', () => {
    fc.assert(fc.property(fc.integer(), (seed) => {
      const [one] = fc.sample(state, { seed, numRuns: 1 })
      const [other] = fc.sample(state, { seed, numRuns: 1 })
      if (one === undefined || other === undefined) throw new Error('Nothing sampled')
      expect(one).not.toBe(other)
      expect(Equal.equals(Snackbar.makeModel(one), Snackbar.makeModel(other))).toBe(true)
    }))
  })

  test('the arbitrary states cover every case', () => {
    const states = fc.sample(state, 1_000)
    const shown = states.flatMap((s) => Opt.toArray(s.maybeStanding))
    expect(states.some((s) => Opt.isNone(s.maybeStanding))).toBe(true)
    expect(shown.some(({ entrance }) => entrance === 'Alone')).toBe(true)
    expect(shown.some(({ entrance }) => entrance === 'AfterAnother')).toBe(true)
    expect(shown.some(({ maybeUntil }) => Opt.isNone(maybeUntil))).toBe(true)
    expect(shown.some(({ maybeUntil }) => Opt.isSome(maybeUntil))).toBe(true)
    expect(fc.sample(none<Notice>(), 10).every((s) => Opt.isNone(s.maybeStanding))).toBe(true)
  })
})

describe('the timer', () => {
  /** Runs `subscription` in the background: what it has sent so far, and what it ended with (`None`: still running). */
  const listen = Effect.fnUntraced(function*(subscription: Tea.Subscription<Message>) {
    const heard: { sent: Array<Message>; ended: Opt.Option<Message> } = { sent: [], ended: Opt.none() }
    yield* Effect.forkChild(
      Channel.runForEach(subscription, (value) => Effect.sync(() => heard.sent.push(value))).pipe(
        Effect.tap((done) => Effect.sync(() => (heard.ended = Opt.some(done)))),
      ),
    )
    yield* Effect.yieldNow
    return heard
  })

  const run = <A>(effect: Effect.Effect<A>) => Effect.runPromise(Effect.provide(effect, TestClock.layer()))

  test('ends with Expired once the clock passes when the snackbar leaves, sending nothing before', () =>
    run(Effect.gen(function*() {
      const until = DateTime.add(yield* DateTime.now, { seconds: 4 })
      const heard = yield* listen(Snackbar.listen(KeyOf.Standing({ id: 3, until })))
      yield* TestClock.adjust('3999 millis')
      expect(Opt.isNone(heard.ended)).toBe(true)
      yield* TestClock.adjust('1 millis')
      expect(heard.sent).toEqual([])
      expect(heard.ended).toEqual(Opt.some(Msg.Expired({ id: 3 })))
    })))

  // Hidden under another page past its end, it leaves as soon as the page is back.
  test('ends with Expired at once when the snackbar was to leave already', () =>
    run(Effect.gen(function*() {
      yield* TestClock.adjust('10 seconds')
      const until = DateTime.subtract(yield* DateTime.now, { seconds: 2 })
      const heard = yield* listen(Snackbar.listen(KeyOf.Standing({ id: 5, until })))
      expect(heard.sent).toEqual([])
      expect(heard.ended).toEqual(Opt.some(Msg.Expired({ id: 5 })))
    })))
})
