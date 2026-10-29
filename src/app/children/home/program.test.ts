import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as Equal from 'effect/Equal'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { messagesSentBy } from '#libs/tea-snabbdom/view.test_support.ts'
import { tagPath } from '#libs/testing/tag-path.test_support.ts'
import { assertProperty, onlyChanged, outcomesOf } from '#libs/testing/update.test_support.ts'
import { hasExpiringProduct } from './children/products/program.test_arbitrary.ts'
import * as Products from './children/products/program.ts'
import { message, position, state } from './program.test_arbitrary.ts'
import { type Event, type Message, type Model, program, type State } from './program.ts'
import { Position } from './services/viewport/viewport.ts'
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
        // Each tap asks: the parent opens the page once.
        repeatable: (msg) =>
          msg._tag === 'AddRequested' || (msg._tag === 'Products' && msg.message._tag === 'EditRequested'),
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
  test('PositionChanged stores the position, and nothing else', () => {
    assertProperty([state, position], (before, position) => {
      const { after, commands } = step(Msg.PositionChanged({ position }), before)
      return Equal.equals(after, { ...before, position }) && commands.length === 0
    })
  })

  test('InteractionChanged stores its flag, and nothing else while the user scrolls', () => {
    assertProperty([state], (before) => {
      const { after, commands } = step(Msg.InteractionChanged({ isInteracting: true }), before)
      return Equal.equals(after, { ...before, isInteracting: true }) && commands.length === 0
    })
  })

  test('a scroll that ends with the bar half collapsed snaps it to the nearer shape', () => {
    assertProperty([state], (before) => {
      const { after, commands } = step(Msg.InteractionChanged({ isInteracting: false }), before)
      const snap = {
        Expanded: [],
        CloserToExpanded: [{ _tag: 'ExpandBar' }],
        CloserToCollapsed: [{ _tag: 'CollapseBar' }],
        Collapsed: [],
      }[before.position._tag]
      return Equal.equals(after, { ...before, isInteracting: false }) && Equal.equals(commands, snap)
    })
  })
})

// A child's subscriptions run only if the page passes them on.
test('the page listens to the scrolling, and its child to the storage, and to the clock while a product expires', () => {
  assertProperty([state], (s) => {
    const subscriptions = Tea.subscriptionsOf(program)(s)
    return HashMap.has(subscriptions, ['Products', 'changes'])
      && HashMap.has(subscriptions, ['Products', 'clock']) === hasExpiringProduct(s.products)
      && ['scrolling', 'position'].every((key) => HashMap.has(subscriptions, key))
  })
})

// Otherwise the button is the platform's, which leaves the app.
test('the page observes the back button only while the menu is open', () => {
  assertProperty([state], (s) => HashMap.has(Tea.subscriptionsOf(program)(s), 'back-button') === s.isMenuOpen)
})

test('starts its child as the child starts, with its commands', () => {
  expect(program.init.state).toEqual({
    isMenuOpen: false,
    position: Position.Expanded(),
    isInteracting: false,
    products: Products.program.init.state,
  })
  expect(program.init.commands).toEqual(
    (Products.program.init.commands ?? []).map((command) => ({ _tag: 'Products', command })),
  )
})
