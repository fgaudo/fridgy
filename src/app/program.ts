// The root: a stack of pages and the back button. The only module that runs the
// pages' programs (the root view draws their views).
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as About from './pages/about/program.ts'
import * as AddProducts from './pages/add-products/program.ts'
import * as Home from './pages/home/program.ts'
import { Shell } from './services/shell/shell.ts'

export type Page = Data.TaggedEnum<{
  Home: Readonly<{ state: Home.State }>
  AddProducts: Readonly<{ state: AddProducts.State }>
  About: Readonly<{ state: About.State }>
}>

const Page = Data.taggedEnum<Page>()

/** The pages the user went through: the last one is shown. Home is always the first. */
export type State = Readonly<{
  stack: Arr.NonEmptyReadonlyArray<Page>
}>

/** The back button: the root's own message, the pages' are made by `compose`. */
type BackRequested = Readonly<{ _tag: 'BackRequested' }>

export type Deps = Shell | Home.Deps | AddProducts.Deps | About.Deps

/** Only the page on top is drawn. */
export type Model = Readonly<{
  page: Data.TaggedEnum<{
    Home: { model: Home.Model }
    AddProducts: { model: AddProducts.Model }
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

/** Leaves the shown page; Home, the first one, never asks to. */
const leave = (state: State) => {
  const rest = Arr.initNonEmpty(state.stack)
  return { state: Arr.isReadonlyArrayNonEmpty(rest) ? { stack: rest } : state }
}

// The shown page decides when the back button is its own; otherwise nothing listens, and the platform leaves
// the app (Android), or goes back past it (a browser).
const handlesBack = (state: State) =>
  Match.valueTags(top(state), {
    Home: ({ state }) => Home.handlesBack(state),
    // While a product is being added, the button is held so that it does not leave the app.
    AddProducts: () => true,
    About: () => true,
  })

const backButton: Tea.Subscription<BackRequested, Shell> = Channel.unwrap(
  Effect.map(Effect.service(Shell), ({ backButton }) =>
    backButton.pipe(
      Channel.map((): BackRequested => ({ _tag: 'BackRequested' })),
      Channel.mapDone((done): BackRequested => done),
    )),
)

const { child, compose } = Tea.parent<{ state: State }>()

export const program = compose({
  init: (children) => {
    const home = children.Home.init
    return { state: { stack: [Page.Home({ state: home.state })] }, commands: home.commands }
  },
  children: {
    Home: child(Home.program, {
      get: pageState('Home'),
      subscribed: shownPageState('Home'),
      set: (state, home) => replacePage(state, Page.Home({ state: home })),
    }),
    AddProducts: child(AddProducts.program, {
      get: pageState('AddProducts'),
      subscribed: shownPageState('AddProducts'),
      set: (state, page) => replacePage(state, Page.AddProducts({ state: page })),
    }),
    About: child(About.program, {
      get: pageState('About'),
      subscribed: shownPageState('About'),
      set: (state, about) => replacePage(state, Page.About({ state: about })),
    }),
  },
  // The shown page closes what it has open, or asks to be left. A back heard as Home closes its last thing
  // (a double press, before the subscription stops) is the platform's.
  update: (_: BackRequested, children) => (state) =>
    Match.valueTags(top(state), {
      Home: ({ state: home }) =>
        Home.handlesBack(home) ? children.Home.update(Home.ExternalMessage.BackPressed())(state) : Tea.reject,
      AddProducts: () => children.AddProducts.update(AddProducts.ExternalMessage.BackPressed())(state),
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
        // Likewise, the page that adds products opens once on a double tap.
        AddRequested: () => {
          if (top(state)._tag === 'AddProducts') return { state }
          const page = children.AddProducts.init
          return { state: push(state, Page.AddProducts({ state: page.state })), commands: page.commands }
        },
      }),
    AddProducts: () => leave,
    About: () => leave,
  },
  subscriptions: (state) => handlesBack(state) ? HashMap.make(['back-button', backButton]) : HashMap.empty(),
  makeModel: (state, children): Model => ({
    page: Match.valueTags(top(state), {
      Home: () => PageModel.Home({ model: children.Home(state) }),
      AddProducts: () => PageModel.AddProducts({ model: children.AddProducts(state) }),
      About: () => PageModel.About({ model: children.About(state) }),
    }),
  }),
})

export type Message = Tea.MessageOf<typeof program>

export type Command = Tea.CommandOf<typeof program>
