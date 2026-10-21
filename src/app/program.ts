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

export type Message = Data.TaggedEnum<{
  Home: { message: Home.Message }
  About: { message: About.Message }
  /** Android's back button. */
  BackRequested: object
}>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{
  Home: { command: Home.Command }
  About: { command: About.Command }
  ExitApp: object
}>

const Command = Data.taggedEnum<Command>()

export type Deps = Shell | Home.Deps | About.Deps

/** Only the page on top is drawn. */
export type Model = Readonly<{
  page: Data.TaggedEnum<{
    Home: { model: Home.Model }
    About: { model: About.Model }
  }>
}>

const PageModel = Data.taggedEnum<Model['page']>()

// The same wraps for `embed` and the view's `mapDispatch`: a page's offered
// messages stay offered only when both wrap them alike.
export const fromHome = (message: Home.Message) => Message.Home({ message })

export const fromAbout = (message: About.Message) => Message.About({ message })

type Step = Tea.Step<State, Command>

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
const leave = (state: State): Step =>
  Opt.match(pop(state), {
    onNone: () => ({ state, commands: [Command.ExitApp()] }),
    onSome: (previous) => ({ state: previous }),
  })

const about = Tea.embed(About.program, {
  key: 'About',
  wrap: fromAbout,
  wrapCommand: (command) => Command.About({ command }),
  get: pageState('About'),
  subscribed: shownPageState('About'),
  set: (state: State, about) => replacePage(state, Page.About({ state: about })),
  onEvent: () => leave,
})

// Opening About again while it is shown changes nothing, so that a double tap opens it once.
const openAbout = (state: State): Step =>
  top(state)._tag === 'About'
    ? { state }
    : {
      state: push(state, Page.About({ state: About.program.init.state })),
      commands: about.liftCommands(About.program.init.commands),
    }

const home = Tea.embed(Home.program, {
  key: 'Home',
  wrap: fromHome,
  wrapCommand: (command) => Command.Home({ command }),
  get: pageState('Home'),
  subscribed: shownPageState('Home'),
  set: (state: State, home) => replacePage(state, Page.Home({ state: home })),
  onEvent: Match.typeTags<Home.Event>()({
    InfoRequested: () => openAbout,
    LeaveRequested: () => leave,
  }),
})

const backButton: Tea.Subscription<Message, Shell> = Channel.unwrap(
  Effect.map(Effect.service(Shell), ({ backButton }) =>
    backButton.pipe(
      Channel.map(() => Message.BackRequested()),
      Channel.mapDone((done): Message => done),
    )),
)

export const program: Tea.Program<State, Model, Message, Command, Deps> = {
  init: {
    state: { stack: [Page.Home({ state: Home.program.init.state })] },
    commands: home.liftCommands(Home.program.init.commands),
  },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command>>()({
    Home: ({ message }) => home.update(message),
    About: ({ message }) => about.update(message),
    // The shown page closes what it has open, or asks to be left.
    BackRequested: () => (state) =>
      Match.valueTags(top(state), {
        Home: () => home.update(Home.ExternalMessage.BackPressed())(state),
        About: () => about.update(About.ExternalMessage.BackPressed())(state),
      }),
  }),

  runCommand: Match.typeTags<Command>()({
    Home: ({ command }) => home.runCommand(command),
    About: ({ command }) => about.runCommand(command),
    ExitApp: Effect.fn(function*() {
      const { exitApp } = yield* Shell
      yield* exitApp.pipe(
        Effect.catchTag('ShellError', (error) => Effect.logWarning('Could not exit the app', error.cause)),
      )
      return Opt.none()
    }),
  }),

  subscriptions: (state) =>
    HashMap.make(['back-button', backButton]).pipe(
      HashMap.union(home.subscriptions(state)),
      HashMap.union(about.subscriptions(state)),
    ),

  makeModel: (state) => ({
    page: Match.valueTags(top(state), {
      Home: ({ state }) => PageModel.Home({ model: home.makeModel(state) }),
      About: ({ state }) => PageModel.About({ model: about.makeModel(state) }),
    }),
  }),
}
