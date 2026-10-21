// The root: a stack of pages, the back button and leaving the app. The only
// module that runs the pages' programs (the root view draws their views).
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as About from './pages/about/program.ts'
import * as Home from './pages/home/program.ts'
import { Shell } from './ports/shell.ts'

export type Page = Data.TaggedEnum<{
  Home: Readonly<{ state: Home.State }>
  About: Readonly<{ state: About.State }>
}>

const Page = Data.taggedEnum<Page>()

/** The pages the user went through: the last one is shown. Home is always the first. */
export type State = Readonly<{
  stack: Arr.NonEmptyReadonlyArray<Page>
}>

/** Android's back button: the root's own message, the pages' are made by `compose`. */
type BackRequested = Readonly<{ _tag: 'BackRequested' }>

type ExitApp = Readonly<{ _tag: 'ExitApp' }>

export type Deps = Shell | Home.Deps | About.Deps

/** Only the page on top is drawn. */
export type Model = Readonly<{
  page: Data.TaggedEnum<{
    Home: { model: Home.Model }
    About: { model: About.Model }
  }>
}>

const PageModel = Data.taggedEnum<Model['page']>()

const top = (state: State) => Arr.lastNonEmpty(state.stack)

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
const leave = (state: State) =>
  Opt.match(pop(state), {
    onNone: () => ({ state, commands: [{ _tag: 'ExitApp' } as const] }),
    onSome: (previous) => ({ state: previous }),
  })

const backButton: Tea.Subscription<BackRequested, Shell> = Channel.unwrap(
  Effect.map(Effect.service(Shell), ({ backButton }) =>
    backButton.pipe(
      Channel.map((): BackRequested => ({ _tag: 'BackRequested' })),
      Channel.mapDone((done): BackRequested => done),
    )),
)

const { child, compose } = Tea.parent<{ state: State; command: ExitApp }>()

export const program = compose({
  init: { state: { stack: [Page.Home({ state: Home.program.init.state })] } },
  children: {
    Home: child(Home.program, {
      get: pageState('Home'),
      subscribed: shownPageState('Home'),
      set: (state, home) => replacePage(state, Page.Home({ state: home })),
    }),
    About: child(About.program, {
      get: pageState('About'),
      subscribed: shownPageState('About'),
      set: (state, about) => replacePage(state, Page.About({ state: about })),
    }),
  },
  // The shown page closes what it has open, or asks to be left.
  update: (_: BackRequested, children) => (state) =>
    Match.valueTags(top(state), {
      Home: () => children.Home.update(Home.ExternalMessage.BackPressed())(state),
      About: () => children.About.update(About.ExternalMessage.BackPressed())(state),
    }),
  onEvent: {
    Home: (event, children) => (state) =>
      Match.valueTags(event, {
        // Opening About again while it is shown changes nothing, so that a double tap opens it once.
        InfoRequested: () => {
          if (top(state)._tag === 'About') return { state }
          const about = children.About.init
          return { state: push(state, Page.About({ state: about.state })), commands: about.commands }
        },
        LeaveRequested: () => leave(state),
      }),
    About: () => leave,
  },
  runCommand: Effect.fn(function*(_: ExitApp) {
    const { exitApp } = yield* Shell
    yield* exitApp.pipe(
      Effect.catchTag('ShellError', (error) => Effect.logWarning('Could not exit the app', error.cause)),
    )
    return Opt.none()
  }),
  subscriptions: () => HashMap.make(['back-button', backButton]),
  makeModel: (state, { children }): Model => ({
    page: Match.valueTags(top(state), {
      Home: () => PageModel.Home({ model: children.Home(state) }),
      About: () => PageModel.About({ model: children.About(state) }),
    }),
  }),
})

export type Message = Tea.MessageOf<typeof program>

export type Command = Tea.CommandOf<typeof program>
