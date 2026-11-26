import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { messagesSentBy } from '#libs/tea-react/view.test_support.ts'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import { license, licenses, state } from './program.test_arbitrary.ts'
import { type Command, type Event, type Message, type Model, program, type State } from './program.ts'
import type { License } from './services/licenses/licenses.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Ev = Data.taggedEnum<Event>()
const Cmd = Data.taggedEnum<Command>()

const { outcome, step } = outcomesOf(program.update)

const { makeModel } = program

/** An offset of the list, in pixels from its top: above it as the list bounces, at it, or under it. */
const offset = fc.double({ min: -10, max: 10_000, noNaN: true })

/** The messages that `model` holds, the scroll filled with `at`, in the order the view draws them. */
const messagesOf = (model: Model, at: number): ReadonlyArray<Message> => [
  model.back,
  { ...model.scrolled, offset: at },
  model.links.license,
  model.links.source,
  model.links.openFoodFacts,
  model.links.openDatabaseLicense,
  model.links.privacyPolicy,
  model.links.issues,
  ...(model.licenses._tag === 'Loaded'
    ? model.licenses.cards.flatMap((card) => Opt.toArray(Opt.map(card.maybeRepository, ({ open }) => open)))
    : []),
]

/** A message that may arrive in `before`: a load's answer only while it loads. */
const arriving = (before: State): fc.Arbitrary<Message> =>
  fc.oneof(
    fc.constant(Msg.BackPressed()),
    offset.map((at) => Msg.Scrolled({ offset: at })),
    fc.webUrl().map((url) => Msg.LinkPressed({ url })),
    ...(before.licenses._tag === 'Loading' ? [licenses.map((items) => Msg.LicensesLoaded({ licenses: items }))] : []),
    ...(before.version._tag === 'Loading' ? [fc.string().map((version) => Msg.VersionLoaded({ version }))] : []),
  )

const arrival = state.chain((before) => arriving(before).map((message) => [before, message] as const))

const loadingLicenses = state.map((s): State => ({ ...s, licenses: { _tag: 'Loading' } }))

const loadedLicenses = state.filter((s) => s.licenses._tag === 'Loaded')

const loadingVersion = state.map((s): State => ({ ...s, version: { _tag: 'Loading' } }))

const loadedVersion = state.filter((s) => s.version._tag === 'Loaded')

describe('About update', () => {
  test('accepts every message that may arrive, and is deterministic', () => {
    assertProperty(
      [arrival],
      ([before, msg]) => !outcome(msg, before).rejected && Equal.equals(outcome(msg, before), outcome(msg, before)),
    )
  })

  // Going back asks the parent to leave on every tap: the parent removes the page on the first one, so a second
  // tap from the same frame goes to a visit that is over, and the library drops it. A scroll that stays on the
  // same side of the top changes nothing, and is held all the same: the list reports every scroll. A link opens on
  // every press.
  test('the model holds what update accepts, all of it, and acts once when sent twice', () => {
    fc.assert(fc.property(state, offset, (before, at) => {
      expect(dispatchViolations(program.update, {
        state: before,
        held: messagesOf(makeModel(before), at),
        candidates: [Msg.BackPressed(), Msg.Scrolled({ offset: at })],
        repeatable: (msg) => msg._tag === 'BackPressed' || msg._tag === 'LinkPressed',
        inert: (msg, s) => msg._tag === 'Scrolled' && msg.offset <= 0 === s.isAtTop,
      })).toEqual([])
    }))
  })

  // `messagesSentBy` scrolls the list to its top.
  test('the view sends what its model holds', () => {
    assertProperty([state], (before) => {
      const model = makeModel(before)
      return Equal.equals(messagesSentBy<Model, Message>(view, model), messagesOf(model, 0))
    })
  })

  test('LicensesLoaded stores the licenses while they load, and touches nothing else', () => {
    assertProperty([loadingLicenses, licenses], (before, items) => {
      const { after, commands } = step(Msg.LicensesLoaded({ licenses: items }), before)
      return Equal.equals(after, { ...before, licenses: { _tag: 'Loaded', items } }) && commands.length === 0
    })
  })

  // An answer reaches only the visit that asked, which asks once.
  test('LicensesLoaded once the licenses are loaded is a defect', () => {
    fc.assert(fc.property(loadedLicenses, licenses, (before, items) => {
      expect(() => program.update(Msg.LicensesLoaded({ licenses: items }))(before)).toThrow(Tea.InvariantDefect)
    }))
  })

  test('VersionLoaded stores the version while it loads, and touches nothing else', () => {
    assertProperty([loadingVersion, fc.string()], (before, version) => {
      const { after, commands } = step(Msg.VersionLoaded({ version }), before)
      return Equal.equals(after, { ...before, version: { _tag: 'Loaded', version } }) && commands.length === 0
    })
  })

  test('VersionLoaded once the version is loaded is a defect', () => {
    fc.assert(fc.property(loadedVersion, fc.string(), (before, version) => {
      expect(() => program.update(Msg.VersionLoaded({ version }))(before)).toThrow(Tea.InvariantDefect)
    }))
  })

  test('BackPressed asks the parent to leave the page, and changes nothing', () => {
    assertProperty([state], (before) => {
      const { after, events } = step(Msg.BackPressed(), before)
      return Equal.equals(after, before) && Equal.equals(events, [Ev.LeaveRequested()])
    })
  })

  test('LinkPressed opens its URL, and changes nothing', () => {
    assertProperty([state, fc.webUrl()], (before, url) => {
      const { after, commands, events } = step(Msg.LinkPressed({ url }), before)
      return after === before && Equal.equals(commands, [Cmd.OpenLink({ url })]) && events.length === 0
    })
  })

  test('a scroll keeps whether the page is at its top, and the very same state while that does not change', () => {
    assertProperty([state, offset], (before, at) => {
      const { after, commands, events } = step(Msg.Scrolled({ offset: at }), before)
      const isAtTop = at <= 0
      return after.isAtTop === isAtTop && (isAtTop !== before.isAtTop || after === before)
        && Equal.equals(after, { ...before, isAtTop }) && commands.length === 0 && events.length === 0
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
        : Tea.defect('one license makes one card')
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

    test('is data: two equal states built apart make equal models', () => {
      fc.assert(
        fc.property(fc.integer(), (seed) => {
          const [one] = fc.sample(state, { seed, numRuns: 1 })
          const [other] = fc.sample(state, { seed, numRuns: 1 })
          if (one === undefined || other === undefined) throw new Error('nothing sampled')
          expect(Equal.equals(makeModel(one), makeModel(other))).toBe(true)
        }),
        { numRuns: 20 },
      )
    })

    test('a card is titled by the package name when the license has no visible name', () => {
      assertProperty([license, fc.oneof(blank, fc.string())], (l, name) => {
        const card = cardOf({ ...l, name: Opt.some(name) })
        return card.title === (visible(name) ? name : l.packageName) && card.key === l.packageName
      })
    })

    test('a card shows only the visible fields, the publisher or else the email, and opens its repository', () => {
      assertProperty([license], (l) => {
        const card = cardOf(l)
        const shown = (field: Opt.Option<string>) => Opt.filter(field, visible)
        const expectedLines = [shown(l.copyright), Opt.orElse(shown(l.publisher), () => shown(l.email))].flatMap(
          Opt.toArray,
        )
        return Equal.equals(card.maybeLicenses, shown(l.licenses))
          && Equal.equals(card.maybeDescription, shown(l.description))
          && Equal.equals(
            card.maybeRepository,
            Opt.map(shown(l.repository), (url) => ({ url, open: Msg.LinkPressed({ url }) })),
          )
          && Equal.equals(card.lines, expectedLines)
      })
    })
  })
})

// The page always has something to do on back: leave.
test('the page observes the back button in every state, and nothing else', () => {
  assertProperty([state], (s) => Equal.equals(program.subscriptions(s), ['back-button']))
})

test('arbitraries cover every variant of the state', () => {
  const tags = new Set(
    fc.sample(state, 300).flatMap((s) => [`licenses:${s.licenses._tag}`, `version:${s.version._tag}`]),
  )
  expect([...tags].sort()).toEqual(['licenses:Loaded', 'licenses:Loading', 'version:Loaded', 'version:Loading'])
})
