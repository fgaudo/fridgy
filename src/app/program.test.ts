import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import { applyAll } from '@fgaudo/effect-tea/testing'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import { InMemoryStore } from '#infrastructure/in-memory/store.ts'
import { describeTags } from '#libs/logging/describe-tags.ts'
import * as AppInMemory from './in-memory.layer.ts'
import { type Command, type Page, program, type State } from './program.ts'
import { back, openAbout, openForm, openMenu, play, requestInfo, submit, typeName } from './user.test_support.ts'

const Cmd = Data.taggedEnum<Command>()

const tags = (state: State) => state.stack.map((page) => page._tag)

/** The state of Home, wherever it is in the stack. */
const homeState = (state: State) =>
  Opt.map(
    Arr.findFirst(state.stack, (page): page is Data.TaggedEnum.Value<Page, 'Home'> => page._tag === 'Home'),
    (page) => page.state,
  )

const subscriptions = (state: State) => program.subscriptions?.(state) ?? HashMap.empty()

/** The pages whose subscriptions run, from the namespaced keys (`['Home', 'clock']`, …). */
const subscribedPages = (state: State) =>
  new Set(Array.from(HashMap.keys(subscriptions(state))).flatMap((key) => Array.isArray(key) ? [key[0]] : []))

const onAbout = play(openAbout).state

describe('Navigation', () => {
  test('starts on Home', () => {
    expect(tags(program.init.state)).toEqual(['Home'])
  })

  test('Home opens About on top, which loads its data', () => {
    const { state, commands } = play(openAbout)
    expect(tags(state)).toEqual(['Home', 'About'])
    expect(commands.map(describeTags)).toEqual(['About › LoadLicenses', 'About › PickSaying'])
  })

  // The menu's entry tapped twice from the same frame: the second tap is stale.
  test('About opens once on a double tap', () => {
    const withMenu = play([openMenu]).state
    const tap = requestInfo(withMenu)
    const { state } = play([() => tap], withMenu)
    expect(Tea.isRejected(program.update(tap)(state))).toBe(true)
  })

  test('back from About returns to Home, as it was', () => {
    const { state, commands } = play([back], onAbout)
    expect(tags(state)).toEqual(['Home'])
    expect(commands).toEqual([])
    // Opening About closed the menu: Home is otherwise untouched.
    expect(Opt.map(homeState(state), (home) => home.isMenuOpen)).toEqual(Opt.some(false))
  })

  test('back on Home first closes what is open', () => {
    const { state, commands } = play([openMenu, back])
    expect(tags(state)).toEqual(['Home'])
    expect(Opt.map(homeState(state), (home) => home.isMenuOpen)).toEqual(Opt.some(false))
    expect(commands).toEqual([])
  })

  test('back on Home with nothing open exits the app', () => {
    const { state, commands } = play([back])
    expect(tags(state)).toEqual(['Home'])
    expect(commands).toEqual([Cmd.ExitApp()])
  })

  test('Home receives the completion of its operation while About is shown', async () => {
    const submitted = play([openForm, typeName('Milk'), submit])
    const [addProduct] = submitted.commands
    if (addProduct === undefined) {
      throw new Error('submitting started no command')
    }
    const hidden = play(openAbout, submitted.state).state
    const completion = await Effect.runPromise(
      program.runCommand(addProduct).pipe(Effect.provide(AppInMemory.layer.pipe(Layer.provide(InMemoryStore.layer)))),
    )
    const { state } = applyAll(program.update)(Opt.toArray(completion), hidden)
    expect(tags(state)).toEqual(['Home', 'About'])
    expect(Opt.map(homeState(state), (home) => home.addProduct._tag)).toEqual(Opt.some('Closed'))
  })
})

describe('Subscriptions', () => {
  test('Home listens while it is shown', () => {
    expect(subscribedPages(program.init.state)).toEqual(new Set(['Home']))
  })

  // Home's scrolling subscriptions would otherwise react to About's scrolling, e.g. scroll it to the top.
  test('a page under another one stops listening', () => {
    expect(subscribedPages(onAbout).has('Home')).toBe(false)
  })

  test('a page listens again once it is shown again', () => {
    expect(subscribedPages(play([back], onAbout).state)).toEqual(new Set(['Home']))
  })

  test('the back button is always listened to', () => {
    for (const state of [program.init.state, onAbout]) {
      expect(HashMap.has(subscriptions(state), 'back-button')).toBe(true)
    }
  })
})
