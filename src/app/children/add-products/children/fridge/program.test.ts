import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as Product from '#domain/product.ts'
import * as Day from '#libs/dates/day.ts'
import { messagesSentBy } from '#libs/tea-react/view.test_support.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import { external, message, state } from './program.test_arbitrary.ts'
import { type Due, type Fridge, type Key, type Message, type Model, program, type State } from './program.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const K = Data.taggedEnum<Key>()

const { outcome, step } = outcomesOf(program.update)

const { makeModel } = program

/** The numbers of the products on their way into the fridge. */
const onTheirWay = (fridge: Fridge): ReadonlyArray<number> =>
  fridge._tag === 'Open' ? fridge.arrivals.map(({ id }) => id) : []

/** Whether the fridge is closing behind the product added as the `id`th. */
const closesBehind = (fridge: Fridge, id: number) => fridge._tag === 'Closing' && fridge.last.id === id

/** A timer's end for a product it does not wait for. */
const cannotArrive = (msg: Message, before: State) =>
  (msg._tag === 'Arrived' && !onTheirWay(before.fridge).includes(msg.id))
  || (msg._tag === 'FridgeClosed' && !closesBehind(before.fridge, msg.id))

describe('Fridge update', () => {
  test('is total and deterministic, but for a message that cannot arrive', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(!cannotArrive(msg, before))
      return Equal.equals(outcome(msg, before), outcome(msg, before))
    })
  })

  // The timers are keyed by the product they wait for, so an end heard for any other is a bug.
  test('Arrived is a defect for a product not on its way, FridgeClosed for one the fridge is not closing behind', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(cannotArrive(msg, before))
      expect(() => program.update(msg)(before)).toThrow(Tea.InvariantDefect)
      return true
    })
  })

  test('Arrived takes the product out of those on their way, and closes the door behind the last', () => {
    assertProperty([state], (before) => {
      const { fridge } = before
      return fridge._tag !== 'Open' || fridge.arrivals.every((arrival) => {
        const rest = fridge.arrivals.filter(({ id }) => id !== arrival.id)
        const expected: Fridge = Arr.isReadonlyArrayNonEmpty(rest)
          ? { ...fridge, arrivals: rest }
          : { _tag: 'Closing', visit: fridge.visit, last: arrival }
        return Equal.equals(step(Msg.Arrived({ id: arrival.id }), before), {
          rejected: false,
          after: { ...before, fridge: expected },
          commands: [],
          events: [],
        })
      })
    })
  })

  test('FridgeClosed sends the fridge away', () => {
    assertProperty([state], (before) => {
      const { fridge } = before
      return fridge._tag !== 'Closing'
        || Equal.equals(step(Msg.FridgeClosed({ id: fridge.last.id }), before).after, {
          ...before,
          fridge: { _tag: 'Away' },
        })
    })
  })
})

describe('Admitted', () => {
  test('sends the product into the fridge by its number, on the day told: it brings the fridge, joins those on their way, or opens the door again', () => {
    assertProperty([state, external], (before, told) => {
      const { fridge, added } = before
      const coming = { id: added, product: told.product, addedOn: told.today }
      const expected: Fridge = fridge._tag === 'Away'
        ? { _tag: 'Open', visit: added, opening: 'WithFridge', arrivals: [{ ...coming, entrance: 'WithFridge' }] }
        : fridge._tag === 'Open'
        ? { ...fridge, arrivals: [...fridge.arrivals, { ...coming, entrance: 'IntoOpenFridge' }] }
        : { _tag: 'Open', visit: fridge.visit, opening: 'Again', arrivals: [{ ...coming, entrance: 'IntoOpenFridge' }] }
      const { state: after, commands, events } = program.external(told)(before)
      return Equal.equals(after, { added: added + 1, fridge: expected })
        && (commands ?? []).length === 0 && (events ?? []).length === 0
    })
  })

  // Two products added within a second have the same creation date: their numbers tell them apart.
  test('two in a row send both products on their way, each by a number of its own', () => {
    assertProperty([state, external, external], (before, first, second) => {
      const after = program.external(second)(program.external(first)(before).state).state
      const ids = onTheirWay(after.fridge)
      return ids.length >= 2 && new Set(ids).size === ids.length
    })
  })
})

test('times each product on its way into the fridge, by its entrance, and the closing behind the last', () => {
  assertProperty([state], (s) => {
    const { fridge } = s
    const expected: ReadonlyArray<Key> = fridge._tag === 'Open'
      ? fridge.arrivals.map(({ id, entrance }) => K.Arriving({ id, entrance }))
      : fridge._tag === 'Closing'
      ? [K.Closing({ id: fridge.last.id })]
      : []
    return Equal.equals(program.subscriptions(s), expected)
  })
})

describe('the model', () => {
  // A product just added has not expired: one whose day ends during its flight is due now.
  test('shows each product on its way due by the days from the day it was added on, as Home tells it, and the product the door closes behind', () => {
    assertProperty([state], (s) => {
      const expected: Model = s.fridge._tag === 'Open'
        ? {
          _tag: 'Open',
          visit: s.fridge.visit,
          opening: s.fridge.opening,
          arrivals: Arr.map(s.fridge.arrivals, ({ id, product, entrance, addedOn }) => ({
            id,
            product,
            entrance,
            due: Opt.match(product.maybeExpirationDate, {
              onNone: (): Due => ({ _tag: 'Never' }),
              onSome: (expirationDate): Due => {
                const days = Day.daysBetween(addedOn, expirationDate)
                return days <= 1
                  ? { _tag: 'Now', expirationDate }
                  : days <= Product.SOON_DAYS
                  ? { _tag: 'Soon', expirationDate }
                  : { _tag: 'Later', expirationDate }
              },
            }),
          })),
        }
        : s.fridge._tag === 'Closing'
        ? { _tag: 'Closing', visit: s.fridge.visit, last: s.fridge.last.product }
        : { _tag: 'Away' }
      return Equal.equals(makeModel(s), expected)
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

  // Guards against the properties above passing on one case only.
  test('the arbitrary state covers every phase, and every due', () => {
    const models = fc.sample(state, 1_000).map(makeModel)
    const dues = models.flatMap((model) => model._tag === 'Open' ? model.arrivals.map(({ due }) => due._tag) : [])
    expect(new Set(models.map((model) => model._tag))).toEqual(new Set(['Away', 'Open', 'Closing']))
    expect(new Set(dues)).toEqual(new Set(['Never', 'Now', 'Soon', 'Later']))
  })
})

// Only its timers send its messages.
test('the view sends nothing', () => {
  assertProperty([state], (s) => messagesSentBy<Model, Message>(view, makeModel(s)).length === 0)
})
