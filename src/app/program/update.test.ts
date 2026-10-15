import { describe, expect, test } from 'bun:test'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import * as Engine from '@/libs/elm/engine.ts'
import * as Home from '../pages/home/program.ts'
import { InternalMessage } from './messages.ts'
import { homeState, type State, top } from './state.ts'
import { init, update } from './update.ts'

const fromHome = (message: Home.InternalMessage) => InternalMessage.GotHomeMsg({ message })

/** Applies the messages in order, collecting the commands. */
const run = (messages: ReadonlyArray<InternalMessage>, from: State = init.state) =>
  messages.reduce(
    ({ state, commands }, message) => {
      const result = update(message)(state)
      if (Engine.isRejected(result)) throw new Error(`update rejected ${message._tag}`)
      return { state: result.state, commands: [...commands, ...(result.commands ?? [])] }
    },
    { state: from, commands: [] as ReadonlyArray<unknown> },
  )

const tags = (state: State) => state.stack.map((page) => page._tag)

const openAbout = fromHome(Home.Message.InfoRequested())
const back = InternalMessage.BackRequested()

describe('Navigation', () => {
  test('starts on Home', () => {
    expect(tags(init.state)).toEqual(['Home'])
  })

  test('Home opens About on top, which loads its data', () => {
    const { state, commands } = run([openAbout])
    expect(tags(state)).toEqual(['Home', 'About'])
    expect(top(state)._tag).toBe('About')
    expect(commands.length).toBe(2)
  })

  test('opening About again while it is shown changes nothing', () => {
    const opened = run([openAbout]).state
    const { state, commands } = run([openAbout], opened)
    expect(tags(state)).toEqual(['Home', 'About'])
    expect(commands.length).toBe(0)
  })

  test('back from About returns to Home, as it was', () => {
    const onAbout = run([fromHome(Home.Message.MenuToggled()), openAbout]).state
    const { state, commands } = run([back], onAbout)
    expect(tags(state)).toEqual(['Home'])
    expect(commands.length).toBe(0)
    // Opening About closed the menu: Home is otherwise untouched.
    expect(Opt.map(homeState(state), (home) => home.isMenuOpen)).toEqual(Opt.some(false))
  })

  test('back on Home first closes what is open', () => {
    const { state, commands } = run([fromHome(Home.Message.MenuToggled()), back])
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
    const { state } = run([openAbout, fromHome(Home.Message.TimeChanged({ now }))])
    expect(top(state)._tag).toBe('About')
    expect(Opt.flatMap(homeState(state), (home) => home.maybeNow)).toEqual(Opt.some(now))
  })
})
