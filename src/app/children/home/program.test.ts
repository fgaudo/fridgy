import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as Equal from 'effect/Equal'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import type { ProductId } from '#domain/product.ts'
import { messagesSentBy } from '#libs/tea-react/view.test_support.ts'
import { tagPath } from '#libs/testing/tag-path.test_support.ts'
import { assertProperty, onlyChanged, outcomesOf } from '#libs/testing/update.test_support.ts'
import { hasExpiringProduct } from './children/products/program.test_arbitrary.ts'
import * as Products from './children/products/program.ts'
import { height, message, own, reported, state, top, type Whole, wholeOf } from './program.test_arbitrary.ts'
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

/** The whole states of the page, with its own state changed as `change` says. */
const changed = (change: (own: State) => State) => wholeOf(own.map(change))

/** The state of the products, as the library keeps it: what a precondition of a test reads. */
const productsOf = (state: Whole) => Opt.getOrThrow(state.children.Products).state.own

/**
 * A message that cannot arrive in that state: a completion outside its deletion, the end of the rows' motion while
 * none moves, a tick while no product expires.
 */
const cannotArrive = (msg: Message, before: Whole) => {
  if (msg._tag !== 'Products') {
    return false
  }
  const products = productsOf(before)
  const inner = msg.message
  return ((inner._tag === 'Deleted' || inner._tag === 'DeleteFailed') && products.selection._tag !== 'Deleting')
    || (inner._tag === 'RowsSettled'
      && (products.list._tag !== 'Loaded'
        || (HashSet.size(products.list.arrivals) === 0 && products.list.departures.length === 0)))
    || (inner._tag === 'TimeChanged' && !hasExpiringProduct(products))
}

/** Whether the list shows a selection: while it is loaded, and some products are selected or being deleted. */
const showsSelection = (state: Whole) => {
  const products = productsOf(state)
  return products.list._tag === 'Loaded' && products.selection._tag !== 'Idle'
}

/** What the list reports of its layout and its scroll: the view fills each with what the list gives. */
const isReport = (msg: Message) =>
  msg._tag === 'HeadlineLaidOut' || msg._tag === 'ListLaidOut' || msg._tag === 'ContentSized'
  || msg._tag === 'Scrolled' || msg._tag === 'ScrollEnded'

describe('Home update', () => {
  test('is total and deterministic, but for a message that cannot arrive', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(!cannotArrive(msg, before))
      return Equal.equals(outcome(msg, before), outcome(msg, before))
    })
  })

  describe('view and update agree', () => {
    // Each message the view sends is accepted in the state it was rendered from, or its control would do nothing.
    // Sent twice from the same frame (a double tap, or a tap on a view that has not caught up yet), it acts once.
    // The add button is the exception: the parent ignores its second tap once the page that adds is shown. What the
    // list reports is held in every state, and a layout or a scroll that the state already has does nothing.
    // What the user could ask for and `update` accepts is in the view, but for what the model hides on purpose:
    // a list that is not shown, or not yet; the menu while products are selected, as the selection's bar takes
    // the place of the bar that opens it; a tap that selects while nothing is, as it opens the product instead.
    test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
      const listOf = (state: Whole) => makeModel(state).products.list
      const isListShown = (state: Whole) => listOf(state)._tag === 'Available'
      const isShown = (state: Whole, id: ProductId) => {
        const list = listOf(state)
        return list._tag === 'Available'
          && list.products.some((row) => row.id === id && row.presence !== 'Leaving')
      }
      const isSelecting = (state: Whole) => {
        const list = listOf(state)
        return list._tag === 'Available' && list.deletion._tag !== 'NothingSelected'
      }
      // Each tap asks: the parent opens the page once.
      const repeatable = (msg: Message) =>
        msg._tag === 'AddRequested' || (msg._tag === 'Products' && msg.message._tag === 'EditRequested')
      const withheld = (msg: Message, state: Whole) => {
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
      }
      fc.assert(fc.property(state, (before) => {
        const products = productsOf(before)
        const items = products.list._tag === 'Loaded' ? products.list.items : []
        const askable = [
          Msg.MenuOpened(),
          Msg.MenuClosed(),
          Msg.InfoRequested(),
          Msg.AddRequested(),
          Msg.ScrollStarted(),
          // As the test's events give them: a layout of nothing, a scroll to the top.
          Msg.HeadlineLaidOut({ height: 0 }),
          Msg.ListLaidOut({ height: 0 }),
          Msg.ContentSized({ height: 0 }),
          Msg.Scrolled({ offset: 0 }),
          Msg.ScrollEnded({ offset: 0 }),
          ...[
            ProductsMsg.SelectionCleared(),
            ProductsMsg.DeleteStarted(),
            ProductsMsg.UndoRequested(),
            ...items.flatMap((item) => [
              ...(['Tap', 'LongPress'] as const).flatMap((by) => [
                ProductsMsg.ItemSelected({ id: item.id, by }),
                ProductsMsg.ItemDeselected({ id: item.id, by }),
              ]),
              ProductsMsg.EditRequested({ id: item.id }),
            ]),
          ].map(fromProducts),
        ]
        expect(dispatchViolations(program.update, {
          state: before,
          held: messagesSentBy<Model, Message>(view, makeModel(before)),
          candidates: askable,
          repeatable,
          inert: isReport,
          withheld,
        })).toEqual([])
      }))
    })

    // The list reports its layout and its scroll whatever they are: the state decides whether a report applies, and
    // the value only what it means. A value that changes nothing is a step that does nothing.
    test('what the list reports is accepted whatever its value, and acts once when sent twice', () => {
      assertProperty(
        [state, fc.array(reported, { maxLength: 5 })],
        (before, reports) =>
          Equal.equals(dispatchViolations(program.update, { state: before, held: reports, inert: isReport }), []),
      )
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
          'ScrollStarted',
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
      cases.forEach(({ msg, isOpenBefore }) =>
        assertProperty([changed((own) => ({ ...own, isMenuOpen: isOpenBefore }))], (from) => {
          const { after, commands } = step(msg, from)
          return after.own.isMenuOpen === !isOpenBefore && onlyChanged(from.own, after.own, 'isMenuOpen')
            && after.children === from.children
            && commands.length === 0
        })
      )
    })

    test('are rejected when the menu is already in the state they ask for', () => {
      cases.forEach(({ msg, isOpenBefore }) =>
        assertProperty([changed((own) => ({ ...own, isMenuOpen: !isOpenBefore }))], (from) => rejects(msg, from))
      )
    })
  })

  test('InfoRequested closes the menu and asks for the info page, or is rejected when the menu is closed', () => {
    assertProperty([state], (before) => {
      if (!before.own.isMenuOpen) {
        return rejects(Msg.InfoRequested(), before)
      }
      const { after, commands, events } = step(Msg.InfoRequested(), before)
      return !after.own.isMenuOpen
        && onlyChanged(before.own, after.own, 'isMenuOpen')
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

  // Products' event goes up as Home's: the root opens the page that edits.
  test('a product to edit is asked for as the list asks', () => {
    assertProperty([state], (before) => {
      const products = productsOf(before)
      fc.pre(products.list._tag === 'Loaded' && products.selection._tag === 'Idle')
      const items = products.list._tag === 'Loaded' ? products.list.items : []
      return items.every((item) => {
        if (item._tag !== 'Valid') return true
        const { after, events } = step(fromProducts(ProductsMsg.EditRequested({ id: item.id })), before)
        return after === before && Equal.equals(events, [Ev.EditRequested({ id: item.id, product: item.product })])
      })
    })
  })

  // The root tells the press only while the output says that it is Home's. What is on top closes first.
  describe('the back button, which the root tells', () => {
    const pressed = (from: Whole) => program.external({ _tag: 'BackPressed' })(from)

    test('closes the menu, and leaves the selection for the next press', () => {
      assertProperty([changed((own) => ({ ...own, isMenuOpen: true }))], (from) => {
        const { state: after, commands, events } = pressed(from)
        return !after.own.isMenuOpen && onlyChanged(from.own, after.own, 'isMenuOpen')
          && Equal.equals(after.children, from.children)
          && (commands ?? []).length === 0 && (events ?? []).length === 0
      })
    })

    test('with the menu closed, goes to the list while it shows a selection', () => {
      assertProperty([changed((own) => ({ ...own, isMenuOpen: false }))], (from) => {
        fc.pre(showsSelection(from))
        const { state: after } = pressed(from)
        const told = Products.program.external({ _tag: 'BackPressed' })(Opt.getOrThrow(from.children.Products).state)
        return after.own === from.own
          && Equal.equals(Opt.map(after.children.Products, ({ state }) => state), Opt.some(told.state))
      })
    })

    test('is a defect while the menu is closed and the list shows no selection', () => {
      fc.assert(fc.property(changed((own) => ({ ...own, isMenuOpen: false })), (from) => {
        fc.pre(!showsSelection(from))
        expect(() => pressed(from)).toThrow(Tea.InvariantDefect)
      }))
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
          fc.pre(before.own.collapse > 0 && before.own.layout[key] !== height)
          const { after, commands } = step(make(height), before)
          const layout = { ...before.own.layout, [key]: height }
          return Equal.equals(after.own, {
            ...before.own,
            layout,
            collapse: 0,
            rest: 0,
            generation: before.own.generation + 1,
          })
            && commands.length === 0
        }),
    )
  })

  test('any other new height is stored, and the bar collapses no further than the list can scroll', () => {
    assertProperty([state, height], (before, height) =>
      layoutMessages.every(({ make, key }) => {
        const layout = { ...before.own.layout, [key]: height }
        if (before.own.layout[key] === height || (key !== 'content' && before.own.collapse > 0)) {
          return true
        }
        const { after, commands } = step(make(height), before)
        const collapse = Math.min(before.own.collapse, collapseAt(layout.content - layout.list, layout.headline))
        return Equal.equals(after.own, { ...before.own, layout, collapse }) && commands.length === 0
      }))
  })

  // The layout reports its heights at every pass: one it already has draws no frame.
  test('a height the layout already has keeps the very same state', () => {
    assertProperty(
      [state],
      (before) => layoutMessages.every(({ make, key }) => step(make(before.own.layout[key]), before).after === before),
    )
  })

  test('a scroll collapses the bar as far as the headline is out of view, keeping the very same state within a step', () => {
    assertProperty([state, top], (before, offset) => {
      const { after, commands } = step(Msg.Scrolled({ offset }), before)
      const collapse = collapseAt(offset, before.own.layout.headline)
      return Equal.equals(after.own, { ...before.own, collapse })
        && (collapse !== before.own.collapse || after === before)
        && commands.length === 0
    })
  })

  // The snap lands on a device pixel: up to half a dp short, at a density of 2 or more.
  test('a scroll up to half a dp short of the headline collapses the bar whole', () => {
    const laidOut = fc.integer({ min: 20, max: 400 }).chain((headline) =>
      changed((own) => ({ ...own, layout: { ...own.layout, headline } }))
    )
    assertProperty(
      [laidOut],
      (from) => step(Msg.Scrolled({ offset: from.own.layout.headline - 0.5 }), from).after.own.collapse === 1,
    )
  })

  test('ScrollStarted says that the user scrolls, or is rejected when they already do', () => {
    assertProperty([state], (before) => {
      if (before.own.isScrolling) {
        return rejects(Msg.ScrollStarted(), before)
      }
      const { after, commands } = step(Msg.ScrollStarted(), before)
      return Equal.equals(after.own, { ...before.own, isScrolling: true }) && commands.length === 0
    })
  })

  test('the end of a scroll stores where the list rests and that the user no longer scrolls, keeping the very same state when both were so', () => {
    assertProperty([state, top], (before, offset) => {
      const { after, commands } = step(Msg.ScrollEnded({ offset }), before)
      return Equal.equals(after.own, { ...before.own, rest: offset, isScrolling: false })
        && (before.own.isScrolling || offset !== before.own.rest || after === before)
        && commands.length === 0
    })
  })

  describe('the model', () => {
    test('collapses the bar as far as the state says, and keys the list by its generation', () => {
      assertProperty(
        [state],
        (s) => makeModel(s).collapse === s.own.collapse && makeModel(s).listKey === s.own.generation,
      )
    })

    // Home is drawn anew when a page over it leaves: its list starts where it was, under the bar as it was.
    test('draws the list from where it last rested', () => {
      assertProperty([state], (s) => makeModel(s).rest === s.own.rest)
    })

    test('snaps the list to its top and to the end of the headline, once it is laid out', () => {
      assertProperty([state], (s) =>
        Equal.equals(
          makeModel(s).snap,
          s.own.layout.headline > 0
            ? { _tag: 'Snapping', offsets: [0, s.own.layout.headline] }
            : { _tag: 'Free' },
        ))
    })

    test('draws the add button as its icon alone while the user scrolls', () => {
      assertProperty([state], (s) => makeModel(s).fab._tag === (s.own.isScrolling ? 'Icon' : 'Extended'))
    })

    test('starts a scroll only while the user is not already scrolling', () => {
      assertProperty([state], (s) => Opt.isSome(makeModel(s).maybeStartScroll) === !s.own.isScrolling)
    })
  })
})

// Two equal states built apart, by the same seed drawn twice: a function in a model would break it.
test('the model is data: equal states, built apart, have equal models', () => {
  assertProperty([fc.integer()], (seed) => {
    const [one] = fc.sample(state, { seed, numRuns: 1 })
    const [other] = fc.sample(state, { seed, numRuns: 1 })
    return one !== undefined && other !== undefined && one !== other
      && Equal.equals(makeModel(one), makeModel(other))
  })
})

/** The keys of the child's subscriptions, as the page lists them. */
const productsKeys = (state: Whole) =>
  program.subscriptions(state).flatMap((key) => typeof key === 'object' && key._tag === 'Products' ? [key.key] : [])

// A child's subscriptions run only if the page passes them on.
test('its child listens to the storage, and to the clock while a product expires', () => {
  assertProperty([state], (s) => {
    const keys = productsKeys(s)
    return keys.includes('changes') && keys.includes('clock') === hasExpiringProduct(productsOf(s))
  })
})

// Otherwise the button is the platform's, which leaves the app.
test('the output gives the back button to the page while its menu is open, or its list shows a selection', () => {
  assertProperty([state], (s) => program.output(s).takesBack === (s.own.isMenuOpen || showsSelection(s)))
})

test('the page has no subscription of its own', () => {
  assertProperty([state], (s) => program.subscriptions(s).every((key) => key._tag === 'Products'))
})

test('starts its child as the child starts, with its commands', () => {
  expect(program.init.state.own).toEqual({
    isMenuOpen: false,
    layout: { headline: 0, list: 0, content: 0 },
    collapse: 0,
    rest: 0,
    generation: 0,
    isScrolling: false,
  })
  expect(Opt.map(program.init.state.children.Products, ({ state }) => state)).toEqual(
    Opt.some(Products.program.init.state),
  )
  expect(program.init.commands ?? []).toEqual(
    (Products.program.init.commands ?? []).map((command) => ({ _tag: 'Products', instance: 1, command })),
  )
})
