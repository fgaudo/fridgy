import { describe, expect, test } from 'bun:test'
import * as Arr from 'effect/Array'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import * as Engine from '@/libs/elm/engine.ts'
import type * as Home from '../pages/home/program.ts'
// Tests may reach into a page: they drive it like its own view and subscriptions would.
import { Message as HomeMessage } from '../pages/home/program/messages.ts'
import { Message } from './messages.ts'
import { top } from './navigation.ts'
import { Page, type State } from './state.ts'
import { init, update } from './update.ts'

const fromHome = (message: Home.Message) => Message.GotHomeMsg({ message })

const run = (messages: ReadonlyArray<Message>, from: State = init.state) =>
  messages.reduce(
    ({ state, commands }, message) => {
      const result = update(message)(state)
      if (Engine.isRejected(result)) throw new Error(`update rejected ${message._tag}`)
      return { state: result.state, commands: [...commands, ...(result.commands ?? [])] }
    },
    { state: from, commands: [] as ReadonlyArray<unknown> },
  )

const tags = (state: State) => state.stack.map((page) => page._tag)

/** The state of Home, wherever it is in the stack. */
const homeState = (state: State) => Opt.map(Arr.findFirst(state.stack, Page.$is('Home')), (page) => page.state)

// About is reached from Home's side menu.
const openAbout = [fromHome(HomeMessage.MenuOpened()), fromHome(HomeMessage.InfoRequested())]
const back = Message.BackRequested()

describe('Navigation', () => {
  test('starts on Home', () => {
    expect(tags(init.state)).toEqual(['Home'])
  })

  test('Home opens About on top, which loads its data', () => {
    const { state, commands } = run(openAbout)
    expect(tags(state)).toEqual(['Home', 'About'])
    expect(top(state)._tag).toBe('About')
    expect(commands.length).toBe(2)
  })

  test('opening About again while it is shown changes nothing', () => {
    const opened = run(openAbout).state
    const { state, commands } = run(openAbout, opened)
    expect(tags(state)).toEqual(['Home', 'About'])
    expect(commands.length).toBe(0)
  })

  test('back from About returns to Home, as it was', () => {
    const onAbout = run(openAbout).state
    const { state, commands } = run([back], onAbout)
    expect(tags(state)).toEqual(['Home'])
    expect(commands.length).toBe(0)
    // Opening About closed the menu: Home is otherwise untouched.
    expect(Opt.map(homeState(state), (home) => home.isMenuOpen)).toEqual(Opt.some(false))
  })

  test('back on Home first closes what is open', () => {
    const { state, commands } = run([fromHome(HomeMessage.MenuOpened()), back])
    expect(tags(state)).toEqual(['Home'])
    expect(Opt.map(homeState(state), (home) => home.isMenuOpen)).toEqual(Opt.some(false))
    expect(commands.length).toBe(0)
  })

  test('back on Home with nothing open exits the app', () => {
    const { state, commands } = run([back])
    expect(tags(state)).toEqual(['Home'])
    expect(commands.length).toBe(1)
  })

  test('Home keeps receiving its messages while About is shown', () => {
    const now = DateTime.makeUnsafe(0)
    const { state } = run([...openAbout, fromHome(HomeMessage.TimeChanged({ now }))])
    expect(top(state)._tag).toBe('About')
    expect(Opt.flatMap(homeState(state), (home) => home.maybeNow)).toEqual(Opt.some(now))
  })
})
