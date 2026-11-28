// The root: Home, and at most one page over it. The only module that runs the pages' programs (the root view draws
// their views). The back button is the root's, which spans the pages: observed while a page is over Home, or Home
// says that it has something to close, and told to the page shown. When it is not observed, the platform leaves the
// app.
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import { type BackButton, pressesAs } from '#infrastructure/back-button/back-button.ts'
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

export type State = Readonly<{
  /** None while Home is shown. */
  maybePage: Opt.Option<Page>
}>

type Own = Readonly<{ _tag: 'BackPressed' }>

type Key = 'back-button'

/**
 * Only the page shown is drawn. A page over Home is another instance of its program at each visit: it is drawn, and
 * sent to, by the instance's number, which no later visit has.
 */
export type Model = Readonly<{
  page: Data.TaggedEnum<{
    Home: { model: Home.Model }
    AddProducts: { instance: number; model: AddProducts.Model }
    EditProduct: { instance: number; model: EditProduct.Model }
    About: { instance: number; model: About.Model }
  }>
}>

const PageModel = Data.taggedEnum<Model['page']>()

const isHomeShown = (state: State) => Opt.isNone(state.maybePage)

const isShown = (tag: Page['_tag']) => (state: State) => Opt.exists(state.maybePage, (page) => page._tag === tag)

/** Shows a page over Home. */
const show = (page: Page): Tea.Step<State> => ({ state: { maybePage: Opt.some(page) } })

/**
 * Leaves a page that asks to: by its close button, by the back button, or by a save that completes. Only the page
 * shown can ask: the library drops what is sent to one that is gone.
 */
const leave = () => (): Tea.Step<State> => ({ state: { maybePage: Opt.none() } })

const backButton: Tea.Subscription<Own, BackButton> = pressesAs<Own>({ _tag: 'BackPressed' })

const { withChildren } = Tea.program<{ state: State; model: Model; message: Own; key: Key }>()

export const program = withChildren({
  // Always there. Under another page it keeps its state and hears its commands' answers, but listens to nothing:
  // the window and its scrolling belong to the page shown.
  Home: Tea.child(Home.program, { listening: isHomeShown }),
  // A page over Home is there while it is shown: it starts as the page is shown and goes as it is left, so that each
  // visit is another instance. An answer for a visit that is over is rejected, and so is a tap of a frame drawn for
  // one, since the view's dispatch names the instance.
  AddProducts: Tea.childWhen(AddProducts.program, { there: isShown('AddProducts') }),
  EditProduct: Tea.childWhen(EditProduct.program, {
    there: (state) =>
      Opt.flatMap(state.maybePage, (page) => page._tag === 'EditProduct' ? Opt.some(page.flags) : Opt.none()),
  }),
  About: Tea.childWhen(About.program, { there: isShown('About') }),
}).make({
  init: { state: { maybePage: Opt.none() } },
  // A press goes to the page shown over Home, which closes what it has open, asks to be left or holds the press. On
  // Home it goes to Home, which says while it takes one.
  update: (_, children) => (state) =>
    Opt.match(state.maybePage, {
      onSome: (page) => ({ state, tell: [{ _tag: page._tag, message: { _tag: 'BackPressed' } }] }),
      onNone: () =>
        children.Home.output().takesBack
          ? { state, tell: [{ _tag: 'Home', message: { _tag: 'BackPressed' } }] }
          : Tea.defect('BackPressed with nothing to close: the button is observed only while something takes it'),
    }),
  onEvent: {
    // Home's requests are honoured only while it is shown. Its view asks on every tap, so two taps of one frame,
    // or a tap from a frame drawn before a page covered Home, ask for what the user has already moved past.
    Home: (event) => (state) =>
      !isHomeShown(state)
        ? { state }
        : Match.valueTags(event, {
          InfoRequested: () => show(Page.About()),
          AddRequested: () => show(Page.AddProducts()),
          EditRequested: ({ id, product }) => show(Page.EditProduct({ flags: { id, product } })),
        }),
    AddProducts: leave,
    EditProduct: leave,
    About: leave,
  },
  // While no program takes the press, the button is not observed, and the platform leaves the app.
  subscriptions: (state, children) => !isHomeShown(state) || children.Home.output().takesBack ? ['back-button'] : [],
  listen: () => backButton,
  // The page that is there, which the state lists one of at most.
  makeModel: (_, children) => ({
    page: Opt.getOrElse(
      Opt.firstSomeOf<Model['page']>([
        Opt.zipWith(
          children.AddProducts.instance(),
          children.AddProducts(),
          (instance, model) => PageModel.AddProducts({ instance, model }),
        ),
        Opt.zipWith(
          children.EditProduct.instance(),
          children.EditProduct(),
          (instance, model) => PageModel.EditProduct({ instance, model }),
        ),
        Opt.zipWith(
          children.About.instance(),
          children.About(),
          (instance, model) => PageModel.About({ instance, model }),
        ),
      ]),
      () => PageModel.Home({ model: children.Home() }),
    ),
  }),
})

export type Message = Tea.MessageOf<typeof program>

export type Command = Tea.CommandOf<typeof program>
