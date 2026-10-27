import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as Equal from 'effect/Equal'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { defect } from '#libs/defect/defect.ts'
import { messagesSentBy } from '#libs/tea-snabbdom/view.test_support.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import { license, licenses, state } from './program.test_arbitrary.ts'
import { type Event, type Message, type Model, program } from './program.ts'
import type { License } from './services/licenses/licenses.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Ev = Data.taggedEnum<Event>()

const { outcome, step } = outcomesOf(program.update)

const { makeModel } = program

const message: fc.Arbitrary<Message> = fc.oneof(
  licenses.map((licenses) => Msg.LicensesLoaded({ licenses })),
  fc.string().map((version) => Msg.VersionLoaded({ version })),
  fc.constant(Msg.BackPressed()),
  fc.integer({ min: -10, max: 10_000 }).map((top) => Msg.Scrolled({ top })),
)

describe('About update', () => {
  test('is total and deterministic', () => {
    assertProperty([state, message], (before, msg) => Equal.equals(outcome(msg, before), outcome(msg, before)))
  })

  // Going back asks the parent to leave on every tap: the parent removes the page
  // on the first one, so a second tap from the same frame is rejected there. The page tells how far it scrolled
  // on every scroll (to its top, in the test's events).
  test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
    const check = dispatchViolations(program.update, {
      repeatable: (msg) => msg._tag === 'BackPressed' || msg._tag === 'Scrolled',
    })
    fc.assert(fc.property(state, (before) => {
      const askable = [Msg.BackPressed(), Msg.Scrolled({ top: 0 })]
      expect(check(before, messagesSentBy<Model, Message>(view, makeModel(before)), askable)).toEqual([])
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

  test('Scrolled says whether the page is at its top, keeping the very same state while that does not change', () => {
    assertProperty([state, fc.integer({ min: -10, max: 10_000 })], (before, top) => {
      const { after, commands } = step(Msg.Scrolled({ top }), before)
      const isAtTop = top <= 0
      return after.isAtTop === isAtTop && (isAtTop !== before.isAtTop || after === before)
        && Equal.equals(after, { ...before, isAtTop }) && commands.length === 0
    })
  })

  describe('the model', () => {
    const blank = fc.string({ unit: fc.constantFrom(' ', '\t', '\n'), maxLength: 3 })
    const visible = (text: string) => text.trim().length > 0
    /** The card of one loaded license. */
    const cardOf = (l: License) => {
      const { licenses } = makeModel({
        isAtTop: true,
        licenses: { _tag: 'Loaded', items: [l] },
        version: { _tag: 'Loading' },
      })
      return licenses._tag === 'Loaded' && licenses.cards[0] !== undefined
        ? licenses.cards[0]
        : defect('one license makes one card')
    }

    test('shows the version and the licenses once they are loaded, and nothing before, and whether it is at its top', () => {
      assertProperty([state], (s) => {
        const model = makeModel(s)
        return model.isAtTop === s.isAtTop
          && model.version._tag === s.version._tag
          && model.licenses._tag === s.licenses._tag
          && (model.licenses._tag !== 'Loaded' || s.licenses._tag !== 'Loaded'
            || model.licenses.cards.length === s.licenses.items.length)
      })
    })

    test('a card is titled by the package name when the license has no visible name', () => {
      assertProperty([license, fc.oneof(blank, fc.string())], (l, name) => {
        const card = cardOf({ ...l, name: Opt.some(name) })
        return card.title === (visible(name) ? name : l.packageName) && card.key === l.packageName
      })
    })

    test('a card shows only the visible fields, the publisher or else the email', () => {
      assertProperty([license], (l) => {
        const card = cardOf(l)
        const shown = (field: Opt.Option<string>) => Opt.filter(field, visible)
        const expectedLines = [shown(l.copyright), Opt.orElse(shown(l.publisher), () => shown(l.email))].flatMap(
          Opt.toArray,
        )
        return Equal.equals(card.maybeLicenses, shown(l.licenses))
          && Equal.equals(card.maybeDescription, shown(l.description))
          && Equal.equals(card.maybeRepository, shown(l.repository))
          && Equal.equals(card.lines, expectedLines)
      })
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
