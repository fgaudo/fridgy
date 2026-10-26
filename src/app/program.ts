// The root: a stack of pages. The only module that runs the pages' programs (the root view draws their views).
// The back button is each page's: a page observes it while it has something to close, or asks to be left; when
// no page observes it, the platform leaves the app (Android itself, or the browser's history, past the app).
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as About from './children/about/program.ts'
import * as AddProducts from './children/add-products/program.ts'
import * as Home from './children/home/program.ts'

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

export type Deps = Home.Deps | AddProducts.Deps | About.Deps

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

/** Where a page lives: wherever it is in the stack, listening only on top. Each page is in the stack at most once. */
const page = <Tag extends Page['_tag']>(tag: Tag) => ({
  get: (state: State): Opt.Option<PageStates[Tag]> =>
    Opt.map(Arr.findFirst(state.stack, isPage(tag)), (page) => page.state),
  subscribed: (state: State): Opt.Option<PageStates[Tag]> =>
    Opt.map(Opt.liftPredicate(top(state), isPage(tag)), (page) => page.state),
  set: (state: State, pageState: PageStates[Tag]): State => ({
    stack: Arr.map(state.stack, (page) => (page._tag === tag ? { _tag: tag, state: pageState } as PageOf<Tag> : page)),
  }),
})

const push = (state: State, page: Page): State => ({ stack: Arr.append(state.stack, page) })

/** Leaves the shown page; Home, the first one, never asks to. */
const leave = (state: State) => {
  const rest = Arr.initNonEmpty(state.stack)
  return { state: Arr.isReadonlyArrayNonEmpty(rest) ? { stack: rest } : state }
}

const { child, compose } = Tea.parent<{ state: State }>()

export const program = compose({
  init: (children) => {
    const home = children.Home.init
    return { state: { stack: [Page.Home({ state: home.state })] }, commands: home.commands }
  },
  children: {
    Home: child(Home.program, page('Home')),
    AddProducts: child(AddProducts.program, page('AddProducts')),
    About: child(About.program, page('About')),
  },
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
