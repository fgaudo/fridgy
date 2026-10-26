import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import type * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import { tagPath } from '#libs/testing/tag-path.test_support.ts'
import * as Home from './children/home/program.ts'
import { type Page, program, type State } from './program.ts'
import { view } from './view.tsx'
import {
  addUndated,
  back,
  openAbout,
  openAddProducts,
  openMenu,
  perform,
  rehearsed,
  requestInfo,
  typeName,
} from './user.test_support.ts'

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

  // The menu's entry tapped twice from the same frame: the second tap reaches a
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

  // Snabbdom patches an element with the same tag and key in place, keeping the
  // props the new page does not set: Home's `scroll-locked` stopped About from scrolling.
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

  test('a product added on its page is in the list of Home once the page is left', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openAddProducts, typeName('Milk')])
      // The page adds a product only once it knows the time.
      yield* user.hearNext(['AddProducts', 'clock'])
      yield* user.send(addUndated)
      yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
      yield* back(user)
      expect(tags(yield* user.state)).toEqual(['Home'])
      yield* user.hearNext(['Home', ['Products', 'changes']])
      const names = Opt.map(homeState(yield* user.state), ({ products: { list } }) =>
        list._tag === 'Loaded'
          ? list.items.flatMap((item): ReadonlyArray<string> => item._tag === 'Valid' ? [item.product.name] : [])
          : [])
      expect(names).toEqual(Opt.some(['Milk']))
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
