import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Opt from 'effect/Option'
import type * as About from '../pages/about/program.ts'
import type * as Home from '../pages/home/program.ts'

export type Page = Data.TaggedEnum<{
  Home: Readonly<{ state: Home.State }>
  About: Readonly<{ state: About.State }>
}>

export const Page = Data.taggedEnum<Page>()

/** The pages the user went through: the last one is shown. Home is always the first. */
export type State = Readonly<{
  stack: Arr.NonEmptyReadonlyArray<Page>
}>

export const top = (state: State): Page => Arr.lastNonEmpty(state.stack)

// A page is found wherever it is in the stack: a page that is not shown still
// receives the completions of its operations.

export const homeState = (state: State): Opt.Option<Home.State> =>
  Opt.map(Arr.findFirst(state.stack, Page.$is('Home')), (page) => page.state)

export const withHomeState = (state: State, home: Home.State): State => ({
  stack: Arr.map(state.stack, (page): Page => (Page.$is('Home')(page) ? Page.Home({ state: home }) : page)),
})

export const aboutState = (state: State): Opt.Option<About.State> =>
  Opt.map(Arr.findFirst(state.stack, Page.$is('About')), (page) => page.state)

export const withAboutState = (state: State, about: About.State): State => ({
  stack: Arr.map(state.stack, (page): Page => (Page.$is('About')(page) ? Page.About({ state: about }) : page)),
})

export const push = (state: State, page: Page): State => ({ stack: Arr.append(state.stack, page) })

/** Removes the shown page; `None` when it is the last one. */
export const pop = (state: State): Opt.Option<State> => {
  const rest = Arr.initNonEmpty(state.stack)
  return Arr.isReadonlyArrayNonEmpty(rest) ? Opt.some({ stack: rest }) : Opt.none()
}
