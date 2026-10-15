// How the root moves between pages: the navigation stack, how each page is
// plugged in (its embed), and what the root does with the events pages emit.
// Used by both `update.ts` and `subs.ts`.
import * as Arr from 'effect/Array'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type * as Engine from '@/libs/elm/engine.ts'
import * as Program from '@/libs/elm/program.ts'
import * as About from '../pages/about/program.ts'
import * as Home from '../pages/home/program.ts'
import type { Shell } from '../ports/shell.ts'
import * as Cmd from './commands.ts'
import { Message } from './messages.ts'
import { Page, type State } from './state.ts'

export type Deps = Home.Deps | About.Deps | Shell

type Step = Engine.Step<State, Message, Deps>

export const top = (state: State): Page => Arr.lastNonEmpty(state.stack)

// A page is found wherever it is in the stack: a page that is not shown still
// receives the completions of its operations.

const homeState = (state: State): Opt.Option<Home.State> =>
  Opt.map(Arr.findFirst(state.stack, Page.$is('Home')), (page) => page.state)

const withHomeState = (state: State, home: Home.State): State => ({
  stack: Arr.map(state.stack, (page): Page => (Page.$is('Home')(page) ? Page.Home({ state: home }) : page)),
})

const aboutState = (state: State): Opt.Option<About.State> =>
  Opt.map(Arr.findFirst(state.stack, Page.$is('About')), (page) => page.state)

const withAboutState = (state: State, about: About.State): State => ({
  stack: Arr.map(state.stack, (page): Page => (Page.$is('About')(page) ? Page.About({ state: about }) : page)),
})

const push = (state: State, page: Page): State => ({ stack: Arr.append(state.stack, page) })

/** Removes the shown page; `None` when it is the last one. */
const pop = (state: State): Opt.Option<State> => {
  const rest = Arr.initNonEmpty(state.stack)
  return Arr.isReadonlyArrayNonEmpty(rest) ? Opt.some({ stack: rest }) : Opt.none()
}

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
