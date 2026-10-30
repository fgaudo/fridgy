import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as Equal from 'effect/Equal'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { messagesSentBy } from '#libs/tea-react/view.test_support.ts'
import { tagPath } from '#libs/testing/tag-path.test_support.ts'
import { assertProperty, onlyChanged, outcomesOf } from '#libs/testing/update.test_support.ts'
import { hasExpiringProduct } from './children/products/program.test_arbitrary.ts'
import * as Products from './children/products/program.ts'
import { height, message, state, top } from './program.test_arbitrary.ts'
import { type Event, type Message, type Model, program, type State } from './program.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Ev = Data.taggedEnum<Event>()
const ProductsMsg = Data.taggedEnum<Products.Message>()

const { outcome, rejects, step } = outcomesOf(program.update)

const { makeModel } = program

type ProductsMessage = Products.Message

// A child's message as the page receives it: the library makes it, the test builds it.
const fromProducts = (message: ProductsMessage): Message => ({ _tag: 'Products', message })

/**
 * A message that cannot arrive in that state: a back heard with the menu closed, or by the list while it shows no
 * selection, a completion outside its deletion, the end of the snackbar while there is none, the end of the rows'
 * motion while none moves, a tick while no product expires.
 */
const cannotArrive = (msg: Message, before: State) =>
  (msg._tag === 'BackPressed' && !before.isMenuOpen)
  || (msg._tag === 'Products' && msg.message._tag === 'BackPressed'
    && (before.products.list._tag !== 'Loaded' || before.products.selection._tag === 'Idle'))
  || (msg._tag === 'Products' && (msg.message._tag === 'Deleted' || msg.message._tag === 'DeleteFailed')
    && before.products.selection._tag !== 'Deleting')
  || (msg._tag === 'Products' && msg.message._tag === 'SnackbarExpired' && before.products.snackbar._tag !== 'Shown')
  || (msg._tag === 'Products' && msg.message._tag === 'RowsSettled'
    && (before.products.list._tag !== 'Loaded'
      || (HashSet.size(before.products.list.arrivals) === 0 && before.products.list.departures.length === 0)))
  || (msg._tag === 'Products' && msg.message._tag === 'TimeChanged' && !hasExpiringProduct(before.products))

describe('Home update', () => {
  test('is total and deterministic, but for a message that cannot arrive', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(!cannotArrive(msg, before))
      return Equal.equals(outcome(msg, before), outcome(msg, before))
    })
  })

  describe('view and update agree', () => {
    // Each message the view sends is accepted in the state it was rendered from,
    // or its control would do nothing; sent twice from the same frame (a double
    // tap, or a tap on a view that has not caught up yet), it acts once, but the
    // add button, whose second tap the parent ignores once the page that adds is
    // shown. And what the user could ask for and `update` accepts is in the view,
    // but for what the model hides on purpose: a list that is not shown, or not yet,
    // the menu while products are selected: the selection's bar takes the place of the bar that opens it,
    // and a tap that selects while nothing is: it opens the product instead.
    test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
      // A loaded list, at a known time when a product expires.
      const shownItems = ({ products }: State) =>
        products.list._tag === 'Loaded' && (Opt.isSome(products.maybeNow) || !hasExpiringProduct(products))
          ? products.list.items
          : []
      const isListShown = (state: State) => shownItems(state).length > 0
      const isShown = (state: State, id: string) =>
        shownItems(state).some((item) => item._tag !== 'Corrupt' && item.id === id)
      const isSelecting = ({ products: { selection } }: State) => selection._tag !== 'Idle'
      const check = dispatchViolations(program.update, {
        // Each tap asks: the parent opens the page once. The list tells of its layout and its scroll as often as
        // they happen.
        repeatable: (msg) =>
          msg._tag === 'AddRequested'
          || msg._tag === 'HeadlineLaidOut'
          || msg._tag === 'ListLaidOut'
          || msg._tag === 'ContentSized'
          || msg._tag === 'Scrolled'
          || msg._tag === 'ScrollStarted'
          || msg._tag === 'ScrollEnded'
          || (msg._tag === 'Products' && msg.message._tag === 'EditRequested'),
        withheld: (msg, state) => {
          if (msg._tag === 'MenuOpened') {
            return isListShown(state) && isSelecting(state)
          }
          if (msg._tag === 'Products') {
            const inner = msg.message
            if (inner._tag === 'ItemSelected' && inner.by === 'Tap' && !isSelecting(state)) {
              return true
            }
            return inner._tag === 'ItemSelected' || inner._tag === 'ItemDeselected' || inner._tag === 'EditRequested'
              ? !isShown(state, inner.id)
              : !isListShown(state)
          }
          return false
        },
      })
      fc.assert(fc.property(state, (before) => {
        const items = before.products.list._tag === 'Loaded' ? before.products.list.items : []
        const askable = [
          Msg.MenuOpened(),
          Msg.MenuClosed(),
          Msg.InfoRequested(),
          Msg.AddRequested(),
          // As the test's events give them: a layout of nothing, a scroll to the top.
          Msg.HeadlineLaidOut({ height: 0 }),
          Msg.ListLaidOut({ height: 0 }),
          Msg.ContentSized({ height: 0 }),
          Msg.Scrolled({ top: 0 }),
          Msg.ScrollStarted(),
          Msg.ScrollEnded({ top: 0 }),
          ...[
            ProductsMsg.SelectionCleared(),
            ProductsMsg.DeleteStarted(),
            ProductsMsg.UndoRequested(),
            ...items.flatMap((item) =>
              item._tag === 'Corrupt'
                ? []
                : [
                  ...(['Tap', 'LongPress'] as const).flatMap((by) => [
                    ProductsMsg.ItemSelected({ id: item.id, by }),
                    ProductsMsg.ItemDeselected({ id: item.id, by }),
                  ]),
                  ProductsMsg.EditRequested({ id: item.id }),
                ]
            ),
          ].map(fromProducts),
        ]
        expect(check(before, messagesSentBy<Model, Message>(view, makeModel(before)), askable)).toEqual([])
      }))
    })

    // Guards against the property above passing only because the view sends
    // nothing interesting: the messages that `update` can reject must be
    // reachable from the view.
    test('the view reaches messages that update can reject', () => {
      const sent = new Set(
        fc.sample(state, 1_000).flatMap((s) => messagesSentBy<Model, Message>(view, makeModel(s)).map(tagPath)),
      )
      for (
        const expected of [
          'MenuOpened',
          'MenuClosed',
          'InfoRequested',
          'AddRequested',
          'Products › ItemSelected',
          'Products › ItemDeselected',
          'Products › EditRequested',
          'Products › SelectionCleared',
          'Products › DeleteStarted',
          'Products › UndoRequested',
        ]
      ) {
        expect(sent.has(expected)).toBe(true)
      }
    })
  })

  describe('MenuOpened and MenuClosed', () => {
    const cases = [
      { msg: Msg.MenuOpened(), isOpenBefore: false },
      { msg: Msg.MenuClosed(), isOpenBefore: true },
    ] as const

    test('open a closed menu, close an open one, and touch nothing else', () => {
      assertProperty([state], (before) =>
        cases.every(({ msg, isOpenBefore }) => {
          const from = { ...before, isMenuOpen: isOpenBefore }
          const { after, commands } = step(msg, from)
          return after.isMenuOpen === !isOpenBefore && onlyChanged(from, after, 'isMenuOpen') && commands.length === 0
        }))
    })

    test('are rejected when the menu is already in the state they ask for', () => {
      assertProperty(
        [state],
        (before) => cases.every(({ msg, isOpenBefore }) => rejects(msg, { ...before, isMenuOpen: !isOpenBefore })),
      )
    })
  })

  test('InfoRequested closes the menu and asks for the info page, or is rejected when the menu is closed', () => {
    assertProperty([state], (before) => {
      if (!before.isMenuOpen) {
        return rejects(Msg.InfoRequested(), before)
      }
      const { after, commands, events } = step(Msg.InfoRequested(), before)
      return !after.isMenuOpen
        && onlyChanged(before, after, 'isMenuOpen')
        && commands.length === 0
        && Equal.equals(events, [Ev.InfoRequested()])
    })
  })

  test('AddRequested asks for the page that adds products, and changes nothing', () => {
    assertProperty([state], (before) => {
      const { after, commands, events } = step(Msg.AddRequested(), before)
      return Equal.equals(after, before) && commands.length === 0 && Equal.equals(events, [Ev.AddRequested()])
    })
  })

  describe('BackPressed', () => {
    test('closes the menu', () => {
      assertProperty([state], (before) => {
        const from = { ...before, isMenuOpen: true }
        const { after, commands, events } = step(Msg.BackPressed(), from)
        return !after.isMenuOpen && onlyChanged(from, after, 'isMenuOpen') && commands.length === 0
          && events.length === 0
      })
    })

    // The button is observed only while the menu is open, so a press with it closed is a bug.
    test('is a defect while the menu is closed', () => {
      assertProperty([state], (before) => {
        expect(() => program.update(Msg.BackPressed())({ ...before, isMenuOpen: false })).toThrow(Tea.InvariantDefect)
        return true
      })
    })
  })
})

describe('scrolling', () => {
  // How far the headline is out of view, in twentieths, rounded.
  const collapseAt = (top: number, headline: number) =>
    headline > 0 ? Math.round(Math.min(Math.max(top / headline, 0), 1) * 20) / 20 : 0

  const layoutMessages = [
    { make: (height: number) => Msg.HeadlineLaidOut({ height }), key: 'headline' },
    { make: (height: number) => Msg.ListLaidOut({ height }), key: 'list' },
    { make: (height: number) => Msg.ContentSized({ height }), key: 'content' },
  ] as const

  test('a new height of the list or the headline draws the list anew at its top, under a collapsed bar', () => {
    assertProperty(
      [state, height],
      (before, height) =>
        layoutMessages.filter(({ key }) => key !== 'content').every(({ make, key }) => {
          fc.pre(before.collapse > 0 && before.layout[key] !== height)
          const { after, commands } = step(make(height), before)
          const layout = { ...before.layout, [key]: height }
          return Equal.equals(after, { ...before, layout, collapse: 0, rest: 0, generation: before.generation + 1 })
            && commands.length === 0
        }),
    )
  })

  test('any other layout is stored, and the bar collapses no further than the list can scroll', () => {
    assertProperty([state, height], (before, height) =>
      layoutMessages.every(({ make, key }) => {
        const layout = { ...before.layout, [key]: height }
        if (key !== 'content' && before.collapse > 0 && before.layout[key] !== height) {
          return true
        }
        const { after, commands } = step(make(height), before)
        const collapse = Math.min(before.collapse, collapseAt(layout.content - layout.list, layout.headline))
        return Equal.equals(after, { ...before, layout, collapse }) && commands.length === 0
      }))
  })

  test('a layout that changes nothing keeps the very same state', () => {
    assertProperty([state], (before) =>
      layoutMessages.every(({ make, key }) => {
        const { layout } = before
        return before.collapse > collapseAt(layout.content - layout.list, layout.headline)
          || step(make(layout[key]), before).after === before
      }))
  })

  test('Scrolled collapses the bar as far as the headline is out of view, keeping the very same state within a step', () => {
    assertProperty([state, top], (before, top) => {
      const { after, commands } = step(Msg.Scrolled({ top }), before)
      const collapse = collapseAt(top, before.layout.headline)
      return Equal.equals(after, { ...before, collapse }) && (collapse !== before.collapse || after === before)
        && commands.length === 0
    })
  })

  // The snap lands on a device pixel: up to half a dp short, at a density of 2 or more.
  test('a scroll up to half a dp short of the headline collapses the bar whole', () => {
    assertProperty([state, fc.integer({ min: 20, max: 400 })], (before, headline) => {
      const from = { ...before, layout: { ...before.layout, headline } }
      return step(Msg.Scrolled({ top: headline - 0.5 }), from).after.collapse === 1
    })
  })

  test('ScrollStarted says that the user scrolls, keeping the very same state when they already did', () => {
    assertProperty([state], (before) => {
      const { after, commands } = step(Msg.ScrollStarted(), before)
      return Equal.equals(after, { ...before, isScrolling: true }) && (!before.isScrolling || after === before)
        && commands.length === 0
    })
  })

  test('ScrollEnded says that the user no longer scrolls, and where the list rests, keeping the very same state when neither changes', () => {
    assertProperty([state, top], (before, top) => {
      const { after, commands } = step(Msg.ScrollEnded({ top }), before)
      return Equal.equals(after, { ...before, isScrolling: false, rest: top })
        && (before.isScrolling || top !== before.rest || after === before) && commands.length === 0
    })
  })

  describe('the model', () => {
    test('collapses the bar as far as the state says, and keys the list by its generation', () => {
      assertProperty([state], (s) => makeModel(s).collapse === s.collapse && makeModel(s).listKey === s.generation)
    })

    // Home is drawn anew when a page over it leaves: its list starts where it was, under the bar as it was.
    test('draws the list from where it last rested', () => {
      assertProperty([state], (s) => makeModel(s).rest === s.rest)
    })

    test('snaps the list to its top and to the end of the headline, once it is laid out', () => {
      assertProperty([state], (s) =>
        Equal.equals(
          makeModel(s).snap,
          s.layout.headline > 0
            ? { _tag: 'Snapping', offsets: [0, s.layout.headline] }
            : { _tag: 'Free' },
        ))
    })

    test('draws the add button as its icon alone while the user scrolls', () => {
      assertProperty([state], (s) => makeModel(s).fab._tag === (s.isScrolling ? 'Icon' : 'Extended'))
    })
  })
})

// A child's subscriptions run only if the page passes them on.
test('its child listens to the storage, and to the clock while a product expires', () => {
  assertProperty([state], (s) => {
    const subscriptions = Tea.subscriptionsOf(program)(s)
    return HashMap.has(subscriptions, ['Products', 'changes'])
      && HashMap.has(subscriptions, ['Products', 'clock']) === hasExpiringProduct(s.products)
  })
})

// Otherwise the button is the platform's, which leaves the app.
test('the page observes the back button only while the menu is open', () => {
  assertProperty([state], (s) => HashMap.has(Tea.subscriptionsOf(program)(s), 'back-button') === s.isMenuOpen)
})

test('starts its child as the child starts, with its commands', () => {
  expect(program.init.state).toEqual({
    isMenuOpen: false,
    layout: { headline: 0, list: 0, content: 0 },
    collapse: 0,
    rest: 0,
    generation: 0,
    isScrolling: false,
    products: Products.program.init.state,
  })
  expect(program.init.commands).toEqual(
    (Products.program.init.commands ?? []).map((command) => ({ _tag: 'Products', command })),
  )
})
