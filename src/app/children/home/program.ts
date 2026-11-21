// The page: its child (the products), and what is the page's own (the top app bar's menu, the back button, the
// ways to the pages that add and edit products, and the scrolling, which the top app bar and the add button follow).
import * as Tea from '@fgaudo/effect-tea'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Optic from 'effect/Optic'
import * as Opt from 'effect/Option'
import type * as Product from '#domain/product.ts'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import * as Products from './children/products/program.ts'

/**
 * The heights the list's layout gives, 0 until it gives them: its headline's, its own and its content's. The inputs
 * `HeadlineHeight`, `ListHeight` and `ContentHeight`.
 */
export type Layout = Readonly<{ headline: number; list: number; content: number }>

export type State = Readonly<{
  isMenuOpen: boolean
  layout: Layout
  /**
   * How far the top app bar has collapsed, from 0 to 1, as its headline, the top of the list, scrolls out of view
   * (`docs/motion.md`, "Home's top app bar and its FAB"). In twentieths. The input `Scroll`.
   */
  collapse: number
  /** Where the list last came to rest, from the top: the input `Rest`. */
  rest: number
  /** Counts the times the list was drawn anew, at its top. */
  generation: number
  /** From the drag to the end of its momentum. */
  isScrolling: boolean
  products: Products.State
}>

/** The page's own messages: its child's, and the writes into its inputs, are made by `make`. */
type Own = Data.TaggedEnum<{
  // From the view.
  MenuOpened: object
  MenuClosed: object
  InfoRequested: object
  AddRequested: object
  ScrollStarted: object
  /** The end of the scroll's momentum: where the list rests is written into `Rest`. */
  ScrollEnded: object
  // From subscriptions.
  /** The back button, heard only while the menu is open, which it closes. */
  BackPressed: object
}>

const Own = Data.taggedEnum<Own>()

export type Event = Data.TaggedEnum<{
  InfoRequested: object
  AddRequested: object
  /** A product of the list, to be edited. */
  EditRequested: { id: string; product: Product.Product }
}>

const Event = Data.taggedEnum<Event>()

export type Model = Readonly<{
  menu: Data.TaggedEnum<{
    Closed: { open: Own }
    Open: { close: Own; requestInfo: Own }
  }>
  add: Own
  /** From 0 to 1: the headline fades out, and the small title and the bar's color fade in. */
  collapse: number
  /** A new key draws the list anew, at its top. */
  listKey: number
  /**
   * Where the list is drawn from: where it last rested. Home is drawn anew when a page over it leaves, and its list
   * would be at its top under a bar still collapsed.
   */
  rest: number
  /** Where the list rests: at its top, or with the headline just out of view. Free until the headline is laid out. */
  snap: Data.TaggedEnum<{ Free: object; Snapping: { offsets: ReadonlyArray<number> } }>
  /** The add button is the icon alone while the user scrolls. */
  fab: Data.TaggedEnum<{ Extended: object; Icon: object }>
  startScroll: Own
  endScroll: Own
  products: Products.Model
}>

// Observed only while the menu is open: otherwise the button is the list's while it shows a selection, or the
// platform's, which leaves the app.
const backButton: Tea.Subscription<Own, BackButton> = Channel.unwrap(
  Effect.map(Effect.service(BackButton), ({ presses }) => Channel.map(presses, () => Own.BackPressed())),
)

const withBackButton: HashMap.HashMap<string, Tea.Subscription<Own, BackButton>> = HashMap.make([
  'back-button',
  backButton,
])

// Each step draws a frame: twenty are a fade, and leave the frames between them to the scroll.
const steps = 20

// Rounded, so that a snap that lands a device pixel short of the headline's end collapses it whole.
const collapseAt = (top: number, { headline }: Layout) =>
  headline > 0 ? Math.round(Math.min(Math.max(top / headline, 0), 1) * steps) / steps : 0

/**
 * A new layout, which Android follows with no scroll event. A new size of the screen or of the font moves the scroll
 * where nothing tells: the list is drawn anew at its top, and the bar expands. A list that gets shorter is pulled back
 * within its end: the bar collapses no further than the list can scroll.
 */
const laidOut = (state: State, layout: Layout): State => {
  const isResized = layout.headline !== state.layout.headline || layout.list !== state.layout.list
  if (isResized && state.collapse > 0) {
    return { ...state, layout, collapse: 0, rest: 0, generation: state.generation + 1 }
  }
  const collapse = Math.min(state.collapse, collapseAt(layout.content - layout.list, layout))
  return Equal.equals(layout, state.layout) && collapse === state.collapse ? state : { ...state, layout, collapse }
}

const { input, child, make } = Tea.program<{ state: State; model: Model; message: Own; event: Event }>()

/** A height of the layout, stored as `laidOut` takes it. */
const height = (key: keyof Layout) =>
  input({
    get: (state) => Opt.some(state.layout[key]),
    set: (state, height: number) => laidOut(state, { ...state.layout, [key]: height }),
  })

/**
 * How far the list has scrolled, in pixels from its top, as far as the bar's collapse tells it apart: the top that
 * the collapse stands for. The very same state within a step: the page scrolls often, and only a change draws a frame.
 */
const scroll = input({
  get: (state) => Opt.some(state.collapse * state.layout.headline),
  set: (state, top: number) => {
    const collapse = collapseAt(top, state.layout)
    return collapse === state.collapse ? state : { ...state, collapse }
  },
})

// The part is always there: only its subscriptions could be turned off.
export const program = make({
  init: (children) => {
    const products = children.Products.init
    return {
      state: {
        isMenuOpen: false,
        layout: { headline: 0, list: 0, content: 0 },
        collapse: 0,
        rest: 0,
        generation: 0,
        isScrolling: false,
        products: products.state,
      },
      commands: products.commands,
    }
  },
  children: {
    Products: child(Products.program, { at: Optic.id<State>().key('products') }),
  },
  inputs: {
    HeadlineHeight: height('headline'),
    ListHeight: height('list'),
    ContentHeight: height('content'),
    Scroll: scroll,
    Rest: input({ at: Optic.id<State>().key('rest') }),
  },
  onEvent: {
    Products: (event) => (state) => ({ state, events: [event] }),
  },
  update: (message) => (state) =>
    Match.valueTags(message, {
      MenuOpened: () => !state.isMenuOpen ? { state: { ...state, isMenuOpen: true } } : Tea.reject,
      MenuClosed: () => state.isMenuOpen ? { state: { ...state, isMenuOpen: false } } : Tea.reject,
      // Asked from the menu, which closes on the way.
      InfoRequested: () =>
        state.isMenuOpen
          ? { state: { ...state, isMenuOpen: false }, events: [Event.InfoRequested()] }
          : Tea.reject,
      // Each tap asks: the parent opens the page once.
      AddRequested: () => ({ state, events: [Event.AddRequested()] }),
      ScrollStarted: () => ({ state: state.isScrolling ? state : { ...state, isScrolling: true } }),
      ScrollEnded: () => ({ state: state.isScrolling ? { ...state, isScrolling: false } : state }),
      BackPressed: () =>
        state.isMenuOpen
          ? { state: { ...state, isMenuOpen: false } }
          : Tea.defect('BackPressed with the menu closed: the button is observed only while it is open'),
    }),
  subscriptions: (state) => state.isMenuOpen ? withBackButton : HashMap.empty(),
  makeModel: (state, children) => ({
    menu: state.isMenuOpen
      ? { _tag: 'Open', close: Own.MenuClosed(), requestInfo: Own.InfoRequested() }
      : { _tag: 'Closed', open: Own.MenuOpened() },
    add: Own.AddRequested(),
    collapse: state.collapse,
    listKey: state.generation,
    rest: state.rest,
    snap: state.layout.headline > 0 ? { _tag: 'Snapping', offsets: [0, state.layout.headline] } : { _tag: 'Free' },
    fab: state.isScrolling ? { _tag: 'Icon' } : { _tag: 'Extended' },
    startScroll: Own.ScrollStarted(),
    endScroll: Own.ScrollEnded(),
    products: children.Products(state),
  }),
})

export type Message = Tea.MessageOf<typeof program>

export type Command = Tea.CommandOf<typeof program>
