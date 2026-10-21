import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { dispatchedBy } from '#libs/tea-snabbdom/view.test_support.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import { type Event, type Message, program } from './program.ts'
import { licenses, state } from './program.test_arbitrary.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Ev = Data.taggedEnum<Event>()

const { outcome, step } = outcomesOf(program.update)

const makeModel = Tea.modelOf(program)

const message: fc.Arbitrary<Message> = fc.oneof(
  licenses.map((licenses) => Msg.LicensesLoaded({ licenses })),
  maybe(fc.string()).map((maybeSaying) => Msg.SayingPicked({ maybeSaying })),
  fc.constant(Msg.BackPressed()),
)

describe('About update', () => {
  test('is total and deterministic', () => {
    assertProperty([state, message], (before, msg) => Equal.equals(outcome(msg, before), outcome(msg, before)))
  })

  // Going back asks the parent to leave on every tap: the parent removes the page
  // on the first one, so a second tap from the same frame is rejected there.
  test('every message the view can dispatch is accepted, and acts once when sent twice', () => {
    const check = dispatchViolations(program.update, { repeatable: (msg) => msg._tag === 'BackPressed' })
    fc.assert(fc.property(state, (before) => {
      expect(check(before, dispatchedBy(view, makeModel(before)))).toEqual([])
    }))
  })

  test('LicensesLoaded stores the licenses and touches nothing else', () => {
    assertProperty([state, licenses], (before, items) => {
      const { after, commands } = step(Msg.LicensesLoaded({ licenses: items }), before)
      return Equal.equals(after, { ...before, licenses: { _tag: 'Loaded', items } }) && commands.length === 0
    })
  })

  test('SayingPicked stores the saying and touches nothing else', () => {
    assertProperty([state, maybe(fc.string())], (before, maybeSaying) => {
      const { after, commands } = step(Msg.SayingPicked({ maybeSaying }), before)
      return Equal.equals(after, { ...before, saying: { _tag: 'Picked', maybeSaying } }) && commands.length === 0
    })
  })

  test('BackPressed asks the parent to leave the page, and changes nothing', () => {
    assertProperty([state], (before) => {
      const { after, events } = step(Msg.BackPressed(), before)
      return Equal.equals(after, before) && Equal.equals(events, [Ev.LeaveRequested()])
    })
  })

  test('the model shows the picked saying, or nothing', () => {
    assertProperty([state], (s) => {
      const expected = s.saying._tag === 'Picked' ? Opt.getOrElse(s.saying.maybeSaying, () => '') : ''
      return makeModel(s).saying === expected
    })
  })
})

test('arbitraries cover every variant of the state', () => {
  const tags = new Set(fc.sample(state, 300).flatMap((s) => [`licenses:${s.licenses._tag}`, `saying:${s.saying._tag}`]))
  expect([...tags].sort()).toEqual(['licenses:Loaded', 'licenses:Loading', 'saying:Loading', 'saying:Picked'])
})
