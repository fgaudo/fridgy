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
import * as AddProduct from './parts/add-product.ts'
import { submitting } from './parts/add-product.test_arbitrary.ts'
import * as Products from './parts/products.ts'
import { deleting } from './parts/products.test_arbitrary.ts'
import * as Scrolling from './parts/scrolling.ts'
import { type Command, type Event, type Message, type Model, program, type State } from './program.ts'
import { message, state } from './program.test_arbitrary.ts'
import { view } from './view.tsx'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()
const Ev = Data.taggedEnum<Event>()
const AddProductMsg = Data.taggedEnum<AddProduct.Message>()
const ProductsMsg = Data.taggedEnum<Products.Message>()

const { outcome, rejects, step } = outcomesOf(program.update)

const { makeModel } = program

type AddProductMessage = AddProduct.Message
type ProductsMessage = Products.Message

// A part's message as the page receives it: the library makes it, the test builds it.
const fromAddProduct = (message: AddProductMessage): Message => ({ _tag: 'AddProduct', message })

const fromProducts = (message: ProductsMessage): Message => ({ _tag: 'Products', message })

describe('Home update', () => {
  test('is total and deterministic', () => {
    assertProperty([state, message], (before, msg) => Equal.equals(outcome(msg, before), outcome(msg, before)))
  })

  describe('view and update agree', () => {
    // Each message the view sends is accepted in the state it was rendered from,
    // or its control would do nothing; sent twice from the same frame (a double
    // tap, or a tap on a view that has not caught up yet), it acts once, as no
    // action of this page is meant to repeat. And what the user could ask for and
    // `update` accepts is in the view, but for what the model hides on purpose:
    // typing while the form is submitted, and a list that is not shown, or not yet
    // (see AGENTS.md, "Refactoring status"), its invalid products.
    test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
      const shownItems = ({ products }: State) =>
        Opt.isSome(products.maybeNow) && products.list._tag === 'Loaded' ? products.list.items : []
      const isListShown = (state: State) => shownItems(state).length > 0
      const isShown = (state: State, id: string) =>
        shownItems(state).some((item) => item._tag === 'Valid' && item.id === id)
      const check = dispatchViolations(program.update, {
        withheld: (msg, state) => {
          if (msg._tag === 'AddProduct') {
            const { _tag } = msg.message
            return (_tag === 'NameChanged' || _tag === 'ExpirationDateChanged')
              && state.addProduct._tag === 'Submitting'
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
      fc.assert(fc.property(state, fc.string(), (before, inputValue) => {
        const items = before.products.list._tag === 'Loaded' ? before.products.list.items : []
        const askable = [
          Msg.MenuOpened(),
          Msg.MenuClosed(),
          Msg.InfoRequested(),
          ...[
            AddProductMsg.Opened(),
            AddProductMsg.Closed(),
            AddProductMsg.Started(),
            AddProductMsg.NameChanged({ name: inputValue }),
            AddProductMsg.ExpirationDateChanged({ expiration: inputValue }),
          ].map(fromAddProduct),
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
        expect(check(before, messagesSentBy<Model, Message>(view, makeModel(before), inputValue), askable)).toEqual([])
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
          'AddProduct › Opened',
          'AddProduct › Closed',
          'AddProduct › Started',
          'AddProduct › NameChanged',
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

  test('BackPressed closes the menu first, then an edited form, and otherwise asks to leave', () => {
    assertProperty([state], (before) => {
      const { after, commands, events } = step(Msg.BackPressed(), before)
      if (before.isMenuOpen) {
        return !after.isMenuOpen && onlyChanged(before, after, 'isMenuOpen') && events.length === 0
      }
      const expected = {
        Editing: () =>
          after.addProduct._tag === 'Closed' && onlyChanged(before, after, 'addProduct') && events.length === 0,
        Submitting: () => Equal.equals(after, before) && events.length === 0,
        Closed: () => Equal.equals(after, before) && Equal.equals(events, [Ev.LeaveRequested()]),
      }[before.addProduct._tag]()
      return expected && commands.length === 0
    })
  })

  describe('a failed operation is said with a toast', () => {
    test('adding a product', () => {
      assertProperty([state, submitting], (base, addProduct) => {
        const { commands } = step(fromAddProduct(AddProductMsg.Completed({ succeeded: false })), {
          ...base,
          addProduct,
        })
        return Equal.equals(commands, [Cmd.ShowToast({ text: 'Could not add the product' })])
      })
    })

    test('deleting products', () => {
      assertProperty([state, deleting], (base, selection) => {
        const before = { ...base, products: { ...base.products, selection } }
        const { commands } = step(fromProducts(ProductsMsg.DeleteCompleted({ succeeded: false })), before)
        return Equal.equals(commands, [Cmd.ShowToast({ text: 'Could not delete the products' })])
      })
    })
  })
})

// A part's subscriptions run only if the page passes them on.
test('the form listens to the clock exactly while it is open', () => {
  assertProperty(
    [state],
    (s) => HashMap.has(Tea.subscriptionsOf(program)(s), ['AddProduct', 'clock']) === (s.addProduct._tag !== 'Closed'),
  )
})

test('starts each part as the part starts, with its commands', () => {
  const lifted = <Tag extends string, C>(_tag: Tag, commands: ReadonlyArray<C> = []) =>
    commands.map((command) => ({ _tag, command }))
  expect(program.init.state).toEqual({
    isMenuOpen: false,
    scrolling: Scrolling.program.init.state,
    addProduct: AddProduct.program.init.state,
    products: Products.program.init.state,
  })
  expect(program.init.commands).toEqual([
    ...lifted('Scrolling', Scrolling.program.init.commands),
    ...lifted('AddProduct', AddProduct.program.init.commands),
    ...lifted('Products', Products.program.init.commands),
  ])
})
