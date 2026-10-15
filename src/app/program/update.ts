import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type * as Engine from '@/libs/elm/engine.ts'
import * as Program from '@/libs/elm/program.ts'
import * as About from '../pages/about/program.ts'
import * as Home from '../pages/home/program.ts'
import type { Shell } from '../ports/shell.ts'
import * as Cmd from './commands.ts'
import { Message } from './messages.ts'
import { aboutState, homeState, Page, pop, push, type State, top, withAboutState, withHomeState } from './state.ts'

export type Deps = Home.Deps | About.Deps | Shell

type Step = Engine.Step<State, Message, Deps>

/** Leaves the shown page; leaving the last one exits the app. */
const leave = (state: State): Step =>
  Opt.match(pop(state), {
    onNone: () => ({ state, commands: [Cmd.exitApp] }),
    onSome: (previous) => ({ state: previous }),
  })

export const about = Program.embed(About.program, {
  key: 'About',
  wrap: (message) => Message.GotAboutMsg({ message }),
  get: aboutState,
  set: withAboutState,
  onEvent: Match.typeTags<About.Event, (state: State) => Step>()({
    LeaveRequested: () => leave,
  }),
})

const openAbout = (state: State): Step =>
  top(state)._tag === 'About'
    ? { state }
    : { ...about.init(About.program.init), state: push(state, Page.About({ state: About.program.init.state })) }

export const home = Program.embed(Home.program, {
  key: 'Home',
  wrap: (message) => Message.GotHomeMsg({ message }),
  get: homeState,
  set: withHomeState,
  onEvent: Match.typeTags<Home.Event, (state: State) => Step>()({
    InfoRequested: () => openAbout,
    LeaveRequested: () => leave,
  }),
})

export const update: Engine.Update<State, Message, Deps> = Match.typeTags<
  Message,
  (state: State) => Engine.Transition<State, Message, Deps>
>()({
  GotHomeMsg: ({ message }) => home.update(message),
  GotAboutMsg: ({ message }) => about.update(message),
  // The shown page decides: it closes what it has open, or asks to be left.
  BackRequested: () => (state) =>
    Match.valueTags(top(state), {
      Home: () => home.update(Home.ExternalMessage.BackPressed())(state),
      About: () => about.update(About.ExternalMessage.BackPressed())(state),
    }),
})

export const init: Step = (() => {
  const homeStep = home.init(Home.program.init)
  return { state: { stack: [Page.Home({ state: homeStep.state })] }, commands: homeStep.commands ?? [] }
})()
