// The root: Home, and at most one page over it. The only module that runs the pages' programs (the root view draws
// their views). The back button is each page's: a page observes it while it has something to close, or asks to be
// left; when no page observes it, the platform leaves the app.
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as About from './children/about/program.ts'
import * as AddProducts from './children/add-products/program.ts'
import * as EditProduct from './children/edit-product/program.ts'
import * as Home from './children/home/program.ts'

/** A page shown over Home, with what it starts from. */
export type Page = Data.TaggedEnum<{
  AddProducts: object
  EditProduct: Readonly<{ flags: EditProduct.Flags }>
  About: object
}>

const Page = Data.taggedEnum<Page>()

/** A page over Home, by the number of its visit: no later page has it. */
export type Visit = Readonly<{ number: number; page: Page }>

export type State = Readonly<{
  /** How many pages were shown over Home so far: the number of the next visit. */
  visits: number
  /** None while Home is shown. */
  maybeVisit: Opt.Option<Visit>
}>

/** Only the page shown is drawn. A page over Home is drawn, and sent to, by the number of its visit. */
export type Model = Readonly<{
  page: Data.TaggedEnum<{
    Home: { model: Home.Model }
    AddProducts: { visit: number; model: AddProducts.Model }
    EditProduct: { visit: number; model: EditProduct.Model }
    About: { visit: number; model: About.Model }
  }>
}>

const PageModel = Data.taggedEnum<Model['page']>()

const isHomeShown = (state: State) => Opt.isNone(state.maybeVisit)

/** The numbers of the visits of a page that are under way: its one visit while it is shown. */
const visitsOf = (tag: Page['_tag']) => (state: State): ReadonlyArray<number> =>
  Opt.match(state.maybeVisit, {
    onNone: () => [],
    onSome: ({ number, page }) => page._tag === tag ? [number] : [],
  })

/** Shows a page over Home, as a visit of its own. */
const show = (state: State, page: Page): Tea.Step<State> => ({
  state: { visits: state.visits + 1, maybeVisit: Opt.some({ number: state.visits, page }) },
})

/**
 * Leaves a page that asks to: by its close or back button, or by a save that completes. Only a visit under way
 * can ask: the library drops what is sent to one that is over.
 */
const leave = () => (state: State): Tea.Step<State> => ({ state: { ...state, maybeVisit: Opt.none() } })

const { child, childById, withChildren } = Tea.program<{ state: State; model: Model }>()

export const program = withChildren({
  // Always there. Under another page it keeps its state and hears its commands' answers, but listens to nothing:
  // the window and its scrolling belong to the page shown.
  Home: child(Home.program, { listening: isHomeShown }),
  // A page over Home is a child by the number of its visit, which starts as the page is shown and goes as it is
  // left. No number is used twice, so neither an answer nor a tap of a frame drawn for a visit reaches a later one.
  AddProducts: childById(AddProducts.program, { ids: visitsOf('AddProducts') }),
  EditProduct: childById(EditProduct.program, {
    flags: (state) =>
      Opt.match(state.maybeVisit, {
        onNone: () => [],
        onSome: ({ number, page }) => page._tag === 'EditProduct' ? [[number, page.flags] as const] : [],
      }),
  }),
  About: childById(About.program, { ids: visitsOf('About') }),
}).make({
  init: { state: { visits: 0, maybeVisit: Opt.none() } },
  onEvent: {
    // Home's requests are honoured only while it is shown. Its view asks on every tap, so two taps of one frame,
    // or a tap from a frame drawn before a page covered Home, ask for what the user has already moved past.
    Home: (event) => (state) =>
      !isHomeShown(state)
        ? { state }
        : Match.valueTags(event, {
          InfoRequested: () => show(state, Page.About()),
          AddRequested: () => show(state, Page.AddProducts()),
          EditRequested: ({ id, product }) => show(state, Page.EditProduct({ flags: { id, product } })),
        }),
    AddProducts: leave,
    EditProduct: leave,
    About: leave,
  },
  makeModel: (state, children) => ({
    page: Opt.match(state.maybeVisit, {
      onNone: () => PageModel.Home({ model: children.Home() }),
      onSome: ({ number: visit, page }) =>
        Match.valueTags(page, {
          AddProducts: () => PageModel.AddProducts({ visit, model: children.AddProducts(visit) }),
          EditProduct: () => PageModel.EditProduct({ visit, model: children.EditProduct(visit) }),
          About: () => PageModel.About({ visit, model: children.About(visit) }),
        }),
    }),
  }),
})

export type Message = Tea.MessageOf<typeof program>

export type Command = Tea.CommandOf<typeof program>
