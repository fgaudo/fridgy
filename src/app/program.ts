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
 * Shows a page over Home, started as its program starts. Only Home asks, and only while it is on top, where the
 * stack is Home alone: a page is in the stack at most once, and the stack never goes deeper than two.
 */
const show = <Tag extends Page['_tag'], Command>(
  state: State,
  tag: Tag,
  start: Readonly<{ state: PageStates[Tag]; commands: ReadonlyArray<Command> }>,
): Tea.Step<State, Command> => ({
  state: { stack: Arr.append(state.stack, { _tag: tag, state: start.state } as PageOf<Tag>) },
  commands: start.commands,
})

/**
 * Leaves the page that asks to, wherever it is in the stack. Only its back button is its own only while it is on
 * top: a tap from a frame drawn before, or a save that completes, may ask while another page covers it. Home,
 * the first page, never asks.
 */
const leave = (tag: Exclude<Page['_tag'], 'Home'>) => (state: State): Tea.Step<State> => {
  const rest = Arr.filter(state.stack, (page) => page._tag !== tag)
  return Arr.isReadonlyArrayNonEmpty(rest)
    ? { state: { stack: rest } }
    : Tea.defect(`${tag} was the only page: Home is always the first`)
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
    // Home's requests are honoured only while it is on top. Its view asks on every tap, so two taps of one frame,
    // or a tap from a frame drawn before a page covered Home, ask for what the user has already moved past: the
    // second of them reaches a stack Home is no longer on top of. Asking to be left is the opposite (`leave`).
    Home: (event, children) => (state) =>
      top(state)._tag !== 'Home'
        ? { state }
        : Match.valueTags(event, {
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
