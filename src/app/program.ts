// The root: a stack of pages. The only module that runs the pages' programs (the root view draws their views).
// The back button is each page's: a page observes it while it has something to close, or asks to be left; when
// no page observes it, the platform leaves the app (Android itself, or the browser's history, past the app).
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import { defect } from '#libs/defect/defect.ts'
import * as About from './children/about/program.ts'
import * as AddProducts from './children/add-products/program.ts'
import * as EditProduct from './children/edit-product/program.ts'
import * as Home from './children/home/program.ts'

export type Page = Data.TaggedEnum<{
  Home: Readonly<{ state: Home.State }>
  AddProducts: Readonly<{ state: AddProducts.State }>
  EditProduct: Readonly<{ state: EditProduct.State }>
  About: Readonly<{ state: About.State }>
}>

const Page = Data.taggedEnum<Page>()

/** The pages the user went through: the last one is shown. Home is always the first. */
export type State = Readonly<{
  stack: Arr.NonEmptyReadonlyArray<Page>
}>

export type Deps = Home.Deps | AddProducts.Deps | EditProduct.Deps | About.Deps

/** Only the page on top is drawn. */
export type Model = Readonly<{
  page: Data.TaggedEnum<{
    Home: { model: Home.Model }
    AddProducts: { model: AddProducts.Model }
    EditProduct: { model: EditProduct.Model }
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

/**
 * Shows a page on top, started as its program starts. Showing the page already shown changes nothing: a page
 * asks to show another one on each tap, and the second tap of a double tap reaches a stack that has it on top.
 */
const show = <Tag extends Page['_tag'], Command>(
  state: State,
  tag: Tag,
  start: Readonly<{ state: PageStates[Tag]; commands: ReadonlyArray<Command> }>,
): Tea.Step<State, Command> =>
  top(state)._tag === tag
    ? { state }
    : {
      state: { stack: Arr.append(state.stack, { _tag: tag, state: start.state } as PageOf<Tag>) },
      commands: start.commands,
    }

/**
 * Leaves the page that asks to: the shown one, since a page asks from its view or from the back button, both
 * its own only while it is on top. Home, the first page, never asks.
 */
const leave = (tag: Exclude<Page['_tag'], 'Home'>) => (state: State): Tea.Step<State> => {
  if (top(state)._tag !== tag) {
    return defect(`${tag} asked to be left while another page is shown: a page asks only while it is on top`)
  }
  const rest = Arr.initNonEmpty(state.stack)
  return Arr.isReadonlyArrayNonEmpty(rest)
    ? { state: { stack: rest } }
    : defect(`${tag} was the only page: Home is always the first`)
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
    EditProduct: child(EditProduct.program, page('EditProduct')),
    About: child(About.program, page('About')),
  },
  onEvent: {
    Home: (event, children) => (state) =>
      Match.valueTags(event, {
        InfoRequested: () => show(state, 'About', children.About.init),
        AddRequested: () => show(state, 'AddProducts', children.AddProducts.init),
        EditRequested: ({ id, product }) => show(state, 'EditProduct', children.EditProduct.init({ id, product })),
      }),
    AddProducts: () => leave('AddProducts'),
    EditProduct: () => leave('EditProduct'),
    About: () => leave('About'),
  },
  makeModel: (state, children): Model => ({
    page: Match.valueTags(top(state), {
      Home: () => PageModel.Home({ model: children.Home(state) }),
      AddProducts: () => PageModel.AddProducts({ model: children.AddProducts(state) }),
      EditProduct: () => PageModel.EditProduct({ model: children.EditProduct(state) }),
      About: () => PageModel.About({ model: children.About(state) }),
    }),
  }),
})

export type Message = Tea.MessageOf<typeof program>

export type Command = Tea.CommandOf<typeof program>
