import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import { tagPath } from '#libs/testing/tag-path.test_support.ts'
import { outcomesOf } from '#libs/testing/update.test_support.ts'
import * as About from './children/about/program.ts'
import * as AddProducts from './children/add-products/program.ts'
import * as Home from './children/home/program.ts'
import { type Message, type Page, program, type State } from './program.ts'
import {
  addProduct,
  back,
  deleteSelected,
  openAbout,
  openAddProducts,
  openMenu,
  perform,
  rehearsed,
  requestInfo,
  selectFirstProduct,
  typeName,
  type User,
  undoDeletion,
} from './user.test_support.ts'
import { view } from './view.tsx'

const Page = Data.taggedEnum<Page>()
const Msg = Data.taggedEnum<Message>()
const HomeMsg = Data.taggedEnum<Home.Message>()
const AddProductsMsg = Data.taggedEnum<AddProducts.Message>()

const { step } = outcomesOf(program.update)

const tags = (state: State) => state.stack.map((page) => page._tag)

/** The state of Home, wherever it is in the stack. */
const homeState = (state: State) =>
  Opt.map(
    Arr.findFirst(state.stack, (page): page is Data.TaggedEnum.Value<Page, 'Home'> => page._tag === 'Home'),
    (page) => page.state,
  )

/** The pages whose subscriptions run, from the namespaced keys (`['Home', 'clock']`, …). */
const subscribedPages = (state: State) =>
  new Set(
    Array.from(HashMap.keys(Tea.subscriptionsOf(program)(state))).flatMap((key) => Array.isArray(key) ? [key[0]] : []),
  )

describe('Navigation', () => {
  test('starts on Home', () => {
    expect(tags(program.init.state)).toEqual(['Home'])
  })

  test('starts Home as Home starts, with its commands', () => {
    expect(homeState(program.init.state)).toEqual(Opt.some(Home.program.init.state))
    expect(program.init.commands).toEqual(
      (Home.program.init.commands ?? []).map((command) => ({ _tag: 'Home', command })),
    )
  })

  test('Home opens About on top, which loads its data', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      expect(tags(yield* user.state)).toEqual(['Home', 'About'])
      expect((yield* user.pending).map(tagPath)).toEqual(['About › LoadLicenses', 'About › LoadVersion'])
      yield* user.runAll
    })))

  // The menu's item tapped twice from the same frame: the second tap reaches a
  // state that has moved on, which the program ignores.
  test('About opens once on a double tap', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openMenu)
      const entry = requestInfo(yield* user.model)
      yield* user.send(() => entry)
      const state = yield* user.state
      expect(tags(state)).toEqual(['Home', 'About'])
      expect(Opt.map(entry, (message) => Tea.isRejected(program.update(message)(state)))).toEqual(Opt.some(true))
      yield* user.runAll
    })))

  // Home asks for About only from its menu, which the first request closes, so no user reaches this; the root
  // does not rely on how Home filters, though: a request for the page shown changes nothing, as it does for
  // AddProducts, which Home asks for on every tap.
  test('About requested while it is shown stays as it is, and is not started again', () => {
    const shown: State = {
      stack: [
        Page.Home({ state: { ...Home.program.init.state, isMenuOpen: true } }),
        Page.About({ state: About.program.init.state }),
      ],
    }
    const { after, commands } = step(Msg.Home({ message: HomeMsg.InfoRequested() }), shown)
    expect(tags(after)).toEqual(['Home', 'About'])
    expect(commands).toEqual([])
  })

  // A page asks to be left from its view or its back button, both its own only while it is shown, so the stack
  // the app builds never has one under another. Were it to, the root would not leave the wrong page.
  test('a page asking to be left while another is shown is a defect', () => {
    const covered: State = {
      stack: [
        Page.Home({ state: Home.program.init.state }),
        Page.AddProducts({ state: AddProducts.program.init.state }),
        Page.About({ state: About.program.init.state }),
      ],
    }
    expect(() => program.update(Msg.AddProducts({ message: AddProductsMsg.BackPressed() }))(covered)).toThrow()
  })

  // About left while its data loads, and opened again: a command cannot be cancelled, and its answer goes to
  // the About that is there when it arrives, so the second visit is loaded by the first one's answers, then
  // hears its own. This is why About accepts a load that completes on a page already loaded.
  test('About opened again while its first loads were pending is loaded once they all complete', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      yield* back(user)
      expect((yield* user.pending).map(tagPath)).toEqual(['About › LoadLicenses', 'About › LoadVersion'])
      yield* perform(user, openAbout)
      expect((yield* user.pending).length).toBe(4)
      yield* user.runAll
      const about = Arr.findFirst(
        (yield* user.state).stack,
        (page): page is Data.TaggedEnum.Value<Page, 'About'> => page._tag === 'About',
      )
      expect(Opt.map(about, ({ state }) => [state.licenses._tag, state.version._tag])).toEqual(
        Opt.some(['Loaded', 'Loaded']),
      )
    })))

  // Snabbdom patches an element with the same tag and key in place, keeping the
  // props the new page does not set: Home's `scroll-locked` stopped About from scrolling. Keyed by the page's
  // name, each page's element is its own, and leaves with its own transition.
  test('each page is drawn in an element of its own', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      const drawn = Effect.map(user.model, (model) => view(model, () => Effect.void).key)
      expect(yield* drawn).toBe('Home')
      yield* perform(user, openAbout)
      expect(yield* drawn).toBe('About')
      yield* user.runAll
    })))

  test('back from About returns to Home, as it was', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      yield* user.runAll
      yield* back(user)
      const state = yield* user.state
      expect(tags(state)).toEqual(['Home'])
      expect(yield* user.pending).toEqual([])
      // Opening About closed the menu: Home is otherwise untouched.
      expect(Opt.map(homeState(state), (home) => home.isMenuOpen)).toEqual(Opt.some(false))
    })))

  test('back on Home first closes what is open', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openMenu)
      yield* back(user)
      const state = yield* user.state
      expect(tags(state)).toEqual(['Home'])
      expect(Opt.map(homeState(state), (home) => home.isMenuOpen)).toEqual(Opt.some(false))
      expect(yield* user.pending).toEqual([])
    })))

  // The add button tapped twice from the same frame: the second tap asks Home again, which changes nothing.
  test('Home opens the page that adds products on top, once on a double tap', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      const add = openAddProducts(yield* user.model)
      yield* user.send(() => add)
      yield* user.send(() => add)
      expect(tags(yield* user.state)).toEqual(['Home', 'AddProducts'])
    })))

  /** The names of the valid products in Home's list. */
  const listedNames = (user: User) =>
    Effect.map(
      user.state,
      (state) =>
        Opt.map(homeState(state), ({ products: { list } }) =>
          list._tag === 'Loaded'
            ? list.items.flatMap((item): ReadonlyArray<string> => item._tag === 'Valid' ? [item.product.name] : [])
            : []),
    )

  test('a product added on its page is in the list of Home once the page is left', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openAddProducts, typeName('Milk')])
      // The page adds a product only once it knows the time.
      yield* user.hearNext(['AddProducts', 'clock'])
      yield* user.send(addProduct)
      yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
      yield* back(user)
      expect(tags(yield* user.state)).toEqual(['Home'])
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk']))
    })))

  test('a product deleted from the list comes back when the deletion is undone in time', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openAddProducts, typeName('Milk')])
      yield* user.hearNext(['AddProducts', 'clock'])
      yield* user.send(addProduct)
      yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
      yield* back(user)
      yield* user.hearNext(['Home', ['Products', 'changes']])
      yield* perform(user, [selectFirstProduct, deleteSelected])
      yield* user.run((command) => tagPath(command) === 'Home › Products › Delete')
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(yield* listedNames(user)).toEqual(Opt.some([]))
      yield* user.send(undoDeletion)
      yield* user.run((command) => tagPath(command) === 'Home › Products › Restore')
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk']))
    })))
})

describe('Subscriptions', () => {
  test('Home listens while it is shown', () => {
    expect(subscribedPages(program.init.state)).toEqual(new Set(['Home']))
  })

  // Home's scrolling subscriptions would otherwise react to About's scrolling, e.g. scroll it to the top.
  test('a page under another one stops listening', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      expect(subscribedPages(yield* user.state).has('Home')).toBe(false)
      yield* user.runAll
    })))

  test('a page listens again once it is shown again', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      yield* user.runAll
      yield* back(user)
      expect(subscribedPages(yield* user.state)).toEqual(new Set(['Home']))
    })))

  // Otherwise the button is the platform's, which leaves the app. Each page observes the button under its own
  // key (`['Home', 'back-button']`, …): what matters here is that exactly the shown page does, when it should.
  test('the back button is observed only while the shown page has something to close', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      const listensToBack = Effect.map(
        user.state,
        (state) =>
          Arr.some(
            Arr.fromIterable(HashMap.keys(Tea.subscriptionsOf(program)(state))),
            (key) => Array.isArray(key) && key[1] === 'back-button',
          ),
      )
      expect(yield* listensToBack).toBe(false)
      yield* user.send(openMenu)
      expect(yield* listensToBack).toBe(true)
      yield* back(user)
      expect(yield* listensToBack).toBe(false)
      yield* perform(user, openAbout)
      expect(yield* listensToBack).toBe(true)
      yield* user.runAll
      yield* back(user)
      expect(yield* listensToBack).toBe(false)
      yield* user.send(openAddProducts)
      expect(yield* listensToBack).toBe(true)
    })))
})
