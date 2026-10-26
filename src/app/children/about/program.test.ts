import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as Equal from 'effect/Equal'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { messagesSentBy } from '#libs/tea-snabbdom/view.test_support.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import { type Event, type Message, type Model, program } from './program.ts'
import { licenses, state } from './program.test_arbitrary.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Ev = Data.taggedEnum<Event>()

const { outcome, step } = outcomesOf(program.update)

const { makeModel } = program

const message: fc.Arbitrary<Message> = fc.oneof(
  licenses.map((licenses) => Msg.LicensesLoaded({ licenses })),
  fc.string().map((version) => Msg.VersionLoaded({ version })),
  fc.constant(Msg.BackPressed()),
)

describe('About update', () => {
  test('is total and deterministic', () => {
    assertProperty([state, message], (before, msg) => Equal.equals(outcome(msg, before), outcome(msg, before)))
  })

  // Going back asks the parent to leave on every tap: the parent removes the page
  // on the first one, so a second tap from the same frame is rejected there.
  test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
    const check = dispatchViolations(program.update, { repeatable: (msg) => msg._tag === 'BackPressed' })
    fc.assert(fc.property(state, (before) => {
      expect(check(before, messagesSentBy<Model, Message>(view, makeModel(before)), [Msg.BackPressed()])).toEqual([])
    }))
  })

  test('LicensesLoaded stores the licenses and touches nothing else', () => {
    assertProperty([state, licenses], (before, items) => {
      const { after, commands } = step(Msg.LicensesLoaded({ licenses: items }), before)
      return Equal.equals(after, { ...before, licenses: { _tag: 'Loaded', items } }) && commands.length === 0
    })
  })

  test('VersionLoaded stores the version and touches nothing else', () => {
    assertProperty([state, fc.string()], (before, version) => {
      const { after, commands } = step(Msg.VersionLoaded({ version }), before)
      return Equal.equals(after, { ...before, version: { _tag: 'Loaded', version } }) && commands.length === 0
    })
  })

  test('BackPressed asks the parent to leave the page, and changes nothing', () => {
    assertProperty([state], (before) => {
      const { after, events } = step(Msg.BackPressed(), before)
      return Equal.equals(after, before) && Equal.equals(events, [Ev.LeaveRequested()])
    })
  })

  test('the model shows the version once it is loaded, and nothing before', () => {
    assertProperty([state], (s) => {
      const expected = s.version._tag === 'Loaded' ? Opt.some(s.version.version) : Opt.none()
      return Equal.equals(makeModel(s).version, expected)
    })
  })
})

// The page always has something to do on back: leave.
test('the page observes the back button in every state', () => {
  assertProperty([state], (s) => HashMap.has(Tea.subscriptionsOf(program)(s), 'back-button'))
})

test('arbitraries cover every variant of the state', () => {
  const tags = new Set(
    fc.sample(state, 300).flatMap((s) => [`licenses:${s.licenses._tag}`, `version:${s.version._tag}`]),
  )
  expect([...tags].sort()).toEqual(['licenses:Loaded', 'licenses:Loading', 'version:Loaded', 'version:Loading'])
})
