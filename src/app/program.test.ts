import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import { tagPath } from '#libs/testing/tag-path.test_support.ts'
import * as Home from './pages/home/program.ts'
import { type Command, type Page, program, type State } from './program.ts'
import {
  back,
  hearNext,
  openAbout,
  openForm,
  openMenu,
  perform,
  rehearsed,
  requestInfo,
  submit,
  typeName,
} from './user.test_support.ts'

const Cmd = Data.taggedEnum<Command>()

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
      expect((yield* user.pending).map(tagPath)).toEqual(['About › LoadLicenses', 'About › PickSaying'])
      yield* user.runAll
    })))

  // The menu's entry tapped twice from the same frame: the second tap is stale.
  test('About opens once on a double tap', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openMenu)
      const entry = requestInfo(yield* user.model)
      yield* user.send(() => entry)
      yield* user.send(() => entry)
      expect(tags(yield* user.state)).toEqual(['Home', 'About'])
      expect((yield* user.ignored).map(tagPath)).toEqual(['Home › InfoRequested'])
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

  test('back on Home with nothing open exits the app', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* back(user)
      expect(tags(yield* user.state)).toEqual(['Home'])
      expect(yield* user.pending).toEqual([Cmd.ExitApp()])
      yield* user.runAll
    })))

  test('Home receives the completion of its operation while About is shown', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openForm, typeName('Milk')])
      // The form adds a product only once it knows the time.
      yield* hearNext(user, ['Home', ['AddProduct', 'clock']])
      yield* user.send(submit)
      yield* perform(user, openAbout)
      yield* user.run((command) => tagPath(command) === 'Home › AddProduct › Add')
      const state = yield* user.state
      expect(tags(state)).toEqual(['Home', 'About'])
      expect(Opt.map(homeState(state), (home) => home.addProduct._tag)).toEqual(Opt.some('Closed'))
      yield* user.runAll
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

  test('the back button is always listened to', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      expect(HashMap.has(Tea.subscriptionsOf(program)(yield* user.state), 'back-button')).toBe(true)
      yield* perform(user, openAbout)
      expect(HashMap.has(Tea.subscriptionsOf(program)(yield* user.state), 'back-button')).toBe(true)
      yield* user.runAll
    })))
})
