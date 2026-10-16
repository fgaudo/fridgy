import * as Arr from 'effect/Array'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Tea from '@fgaudo/effect-tea'
import * as About from '#app/pages/about/program.ts'
import * as Home from '#app/pages/home/program.ts'
import type { Shell } from '#app/ports/shell.ts'
import * as Cmd from './commands.ts'
import { Message } from './messages.ts'
import { Page, type State } from './state.ts'

export type Deps = Home.Deps | About.Deps | Shell

type Step = Tea.Step<State, Message, Deps>

export const top = (state: State): Page => Arr.lastNonEmpty(state.stack)

// A page is found wherever it is in the stack: a page that is not shown still
// receives the completions of its operations. Its subscriptions, though, only
// run while it is shown: the window and its scrolling belong to the page on top.

type PageStates = { readonly [P in Page as P['_tag']]: P['state'] }

type PageOf<Tag extends Page['_tag']> = Page & Readonly<{ _tag: Tag; state: PageStates[Tag] }>

const isPage = <Tag extends Page['_tag']>(tag: Tag) => (page: Page): page is PageOf<Tag> => page._tag === tag

const pageState = <Tag extends Page['_tag']>(tag: Tag) => (state: State): Opt.Option<PageStates[Tag]> =>
  Opt.map(Arr.findFirst(state.stack, isPage(tag)), (page) => page.state)

const shownPageState = <Tag extends Page['_tag']>(tag: Tag) => (state: State): Opt.Option<PageStates[Tag]> =>
  Opt.map(Opt.liftPredicate(top(state), isPage(tag)), (page) => page.state)

/** Puts `replacement` where the page with the same tag is. */
const replacePage = (state: State, replacement: Page): State => ({
  stack: Arr.map(state.stack, (page) => (page._tag === replacement._tag ? replacement : page)),
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

export const about = Tea.embed(About.program, {
  key: 'About',
  wrap: (message) => Message.GotAboutMsg({ message }),
  get: pageState('About'),
  getSubscribed: shownPageState('About'),
  set: (state: State, about: About.State) => replacePage(state, Page.About({ state: about })),
  onEvent: Match.typeTags<About.Event, (state: State) => Step>()({
    LeaveRequested: () => leave,
  }),
})

const openAbout = (state: State): Step =>
  top(state)._tag === 'About'
    ? { state }
    : { ...about.init(About.program.init), state: push(state, Page.About({ state: About.program.init.state })) }

export const home = Tea.embed(Home.program, {
  key: 'Home',
  wrap: (message) => Message.GotHomeMsg({ message }),
  get: pageState('Home'),
  getSubscribed: shownPageState('Home'),
  set: (state: State, home: Home.State) => replacePage(state, Page.Home({ state: home })),
  onEvent: Match.typeTags<Home.Event, (state: State) => Step>()({
    InfoRequested: () => openAbout,
    LeaveRequested: () => leave,
  }),
})
