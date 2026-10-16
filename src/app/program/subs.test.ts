import { describe, expect, test } from 'bun:test'
import * as HashMap from 'effect/HashMap'
import { applyAll } from '@fgaudo/effect-tea/testing'
import type * as Home from '../pages/home/program.ts'
// Tests may reach into a page: they drive it like its own view and subscriptions would.
import { Message as HomeMessage } from '../pages/home/program/messages.ts'
import { Message } from './messages.ts'
import type { State } from './state.ts'
import { subscriptions } from './subs.ts'
import { init, update } from './update.ts'

const fromHome = (message: Home.Message) => Message.GotHomeMsg({ message })

const run = (messages: ReadonlyArray<Message>, from: State = init.state) => applyAll(update)(messages, from).state

/** The pages whose subscriptions run, from the namespaced keys (`['Home', 'clock']`, …). */
const subscribedPages = (state: State) =>
  new Set(Array.from(HashMap.keys(subscriptions(state))).flatMap((key) => Array.isArray(key) ? [key[0]] : []))

const openAbout = [fromHome(HomeMessage.MenuOpened()), fromHome(HomeMessage.InfoRequested())]

describe('Subscriptions', () => {
  test('Home listens while it is shown', () => {
    expect(subscribedPages(init.state)).toEqual(new Set(['Home']))
  })

  // Home's scrolling subscriptions would otherwise react to About's scrolling, e.g. scroll it to the top.
  test('a page under another one stops listening', () => {
    expect(subscribedPages(run(openAbout)).has('Home')).toBe(false)
  })

  test('a page listens again once it is shown again', () => {
    const backOnHome = run([...openAbout, Message.BackRequested()])
    expect(subscribedPages(backOnHome)).toEqual(new Set(['Home']))
  })

  test('the back button is always listened to', () => {
    for (const state of [init.state, run(openAbout)]) {
      expect(HashMap.has(subscriptions(state), 'back-button')).toBe(true)
    }
  })
})
