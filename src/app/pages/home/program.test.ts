import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as Equal from 'effect/Equal'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { tagPath } from '#libs/testing/tag-path.test_support.ts'
import { messagesSentBy } from '#libs/tea-snabbdom/view.test_support.ts'
import { assertProperty, onlyChanged, outcomesOf } from '#libs/testing/update.test_support.ts'
import * as Products from './parts/products/products.ts'
import { type Event, type Message, type Model, program, type State } from './program.ts'
import { message, state } from './program.test_arbitrary.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Ev = Data.taggedEnum<Event>()
const ProductsMsg = Data.taggedEnum<Products.Message>()

const { outcome, rejects, step } = outcomesOf(program.update)

const { makeModel } = program

type ProductsMessage = Products.Message

// A part's message as the page receives it: the library makes it, the test builds it.
const fromProducts = (message: ProductsMessage): Message => ({ _tag: 'Products', message })

/** A message that cannot arrive in that state: a back heard with the menu closed, a completion outside its deletion. */
const cannotArrive = (msg: Message, before: State) =>
  (msg._tag === 'BackPressed' && !before.isMenuOpen)
  || (msg._tag === 'Products' && msg.message._tag === 'DeleteCompleted'
    && before.products.selection._tag !== 'Deleting')

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
    // but for what the model hides on purpose: a list that is not shown, or not yet
    // (see AGENTS.md, "Refactoring status"), its invalid products, and the menu
    // while products are selected: the selection's bar takes the place of its.
    test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
      const shownItems = ({ products }: State) =>
        Opt.isSome(products.maybeNow) && products.list._tag === 'Loaded' ? products.list.items : []
      const isListShown = (state: State) => shownItems(state).length > 0
      const isShown = (state: State, id: string) =>
        shownItems(state).some((item) => item._tag === 'Valid' && item.id === id)
      const isSelecting = ({ products: { selection } }: State) =>
        selection._tag === 'Deleting' || Opt.isSome(selection.maybeIds)
      const check = dispatchViolations(program.update, {
        repeatable: (msg) => msg._tag === 'AddRequested',
        withheld: (msg, state) => {
          if (msg._tag === 'MenuOpened') {
            return isListShown(state) && isSelecting(state)
          }
          if (msg._tag === 'Products') {
            const inner = msg.message
            return inner._tag === 'ItemSelected' || inner._tag === 'ItemDeselected'
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
            ...items.flatMap((item) =>
              item._tag === 'Corrupt'
                ? []
                : [ProductsMsg.ItemSelected({ id: item.id }), ProductsMsg.ItemDeselected({ id: item.id })]
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
          'Products › SelectionCleared',
          'Products › DeleteStarted',
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
        expect(() => program.update(Msg.BackPressed())({ ...before, isMenuOpen: false })).toThrow()
        return true
      })
    })
  })
})

describe('scrolling', () => {
  test('InteractionChanged and AtTopChanged store their flag, and nothing else', () => {
    assertProperty([state, fc.boolean()], (before, flag) => {
      const interacting = step(Msg.InteractionChanged({ isInteracting: flag }), before)
      const atTop = step(Msg.AtTopChanged({ isAtTop: flag }), before)
      return Equal.equals(interacting.after, { ...before, isInteracting: flag })
        && Equal.equals(atTop.after, { ...before, isAtTop: flag })
        && interacting.commands.length === 0
        && atTop.commands.length === 0
    })
  })

  test('CloseToTopChanged scrolls to the top only when close to it and not interacting', () => {
    assertProperty([state, fc.boolean()], (before, isCloseToTop) => {
      const { after, commands } = step(Msg.CloseToTopChanged({ isCloseToTop }), before)
      const shouldScroll = isCloseToTop && !before.isInteracting
      return Equal.equals(after, before) && Equal.equals(commands, shouldScroll ? [{ _tag: 'ScrollToTop' }] : [])
    })
  })
})

// A part's subscriptions run only if the page passes them on.
test('the page listens to the scrolling, and its part to the clock and the storage', () => {
  assertProperty([state], (s) => {
    const subscriptions = Tea.subscriptionsOf(program)(s)
    return ['clock', 'changes'].every((key) => HashMap.has(subscriptions, ['Products', key]))
      && ['scrolling', 'at-top', 'close-to-top'].every((key) => HashMap.has(subscriptions, key))
  })
})

// Otherwise the button is the platform's, which leaves the app.
test('the page observes the back button only while the menu is open', () => {
  assertProperty([state], (s) => HashMap.has(Tea.subscriptionsOf(program)(s), 'back-button') === s.isMenuOpen)
})

test('starts its part as the part starts, with its commands', () => {
  expect(program.init.state).toEqual({
    isMenuOpen: false,
    isAtTop: true,
    isInteracting: false,
    products: Products.program.init.state,
  })
  expect(program.init.commands).toEqual(
    (Products.program.init.commands ?? []).map((command) => ({ _tag: 'Products', command })),
  )
})
