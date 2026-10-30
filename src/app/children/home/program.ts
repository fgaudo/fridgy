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
import type * as Product from '#domain/product.ts'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import * as Products from './children/products/program.ts'

/** The heights the list's layout gives, 0 until it gives them: its headline's, its own and its content's. */
export type Layout = Readonly<{ headline: number; list: number; content: number }>

export type State = Readonly<{
  isMenuOpen: boolean
  layout: Layout
  /**
   * How far the top app bar has collapsed, from 0 to 1, as its headline, the top of the list, scrolls out of view
   * (`docs/motion.md`, "Home's top app bar and its FAB"). In twentieths.
   */
  collapse: number
  /** Counts the times the list was drawn anew, at its top. */
  generation: number
  /** From the drag to the end of its momentum. */
  isScrolling: boolean
  products: Products.State
}>

/** The page's own messages: its child's are made by `compose`. */
type Own = Data.TaggedEnum<{
  // From the view.
  MenuOpened: object
  MenuClosed: object
  InfoRequested: object
  AddRequested: object
  HeadlineLaidOut: { height: number }
  ListLaidOut: { height: number }
  ContentSized: { height: number }
  Scrolled: { top: number }
  ScrollStarted: object
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

export type Deps = BackButton | Products.Deps

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
  /** Where the list rests: at its top, or with the headline just out of view. Free until the headline is laid out. */
  snap: Data.TaggedEnum<{ Free: object; Snapping: { offsets: ReadonlyArray<number> } }>
  /** The add button is the icon alone while the user scrolls. */
  fab: Data.TaggedEnum<{ Extended: object; Icon: object }>
  layOutHeadline: (height: number) => Own
  layOutList: (height: number) => Own
  sizeContent: (height: number) => Own
  scroll: (top: number) => Own
  startScroll: Own
  endScroll: Own
  products: Products.Model
}>

// Observed only while the menu is open: otherwise the button is the list's while it shows a selection, or the
// platform's, which leaves the app.
const backButton: Tea.Subscription<Own, BackButton> = Channel.unwrap(
  Effect.map(Effect.service(BackButton), ({ presses }) => Channel.map(presses, () => Own.BackPressed())),
)

const withBackButton: HashMap.HashMap<string, Tea.Subscription<Own, Deps>> = HashMap.make(['back-button', backButton])

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
    return { ...state, layout, collapse: 0, generation: state.generation + 1 }
  }
  const collapse = Math.min(state.collapse, collapseAt(layout.content - layout.list, layout))
  return Equal.equals(layout, state.layout) && collapse === state.collapse ? state : { ...state, layout, collapse }
}

const { child, compose } = Tea.parent<{ state: State; event: Event }>()

// The part is always there: only its subscriptions could be turned off.
export const program = compose({
  init: (children) => {
    const products = children.Products.init
    return {
      state: {
        isMenuOpen: false,
        layout: { headline: 0, list: 0, content: 0 },
        collapse: 0,
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
  onEvent: {
    Products: Tea.raise,
  },
  update: (message: Own) => (state) =>
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
      HeadlineLaidOut: ({ height }) => ({ state: laidOut(state, { ...state.layout, headline: height }) }),
      ListLaidOut: ({ height }) => ({ state: laidOut(state, { ...state.layout, list: height }) }),
      ContentSized: ({ height }) => ({ state: laidOut(state, { ...state.layout, content: height }) }),
      // The same state within a step: the page scrolls often, and only a change draws a frame.
      Scrolled: ({ top }) => {
        const collapse = collapseAt(top, state.layout)
        return { state: collapse === state.collapse ? state : { ...state, collapse } }
      },
      ScrollStarted: () => ({ state: state.isScrolling ? state : { ...state, isScrolling: true } }),
      ScrollEnded: () => ({ state: state.isScrolling ? { ...state, isScrolling: false } : state }),
      BackPressed: () =>
        state.isMenuOpen
          ? { state: { ...state, isMenuOpen: false } }
          : Tea.defect('BackPressed with the menu closed: the button is observed only while it is open'),
    }),
  subscriptions: (state) => state.isMenuOpen ? withBackButton : HashMap.empty(),
  makeModel: (state, children): Model => ({
    menu: state.isMenuOpen
      ? { _tag: 'Open', close: Own.MenuClosed(), requestInfo: Own.InfoRequested() }
      : { _tag: 'Closed', open: Own.MenuOpened() },
    add: Own.AddRequested(),
    collapse: state.collapse,
    listKey: state.generation,
    snap: state.layout.headline > 0 ? { _tag: 'Snapping', offsets: [0, state.layout.headline] } : { _tag: 'Free' },
    fab: state.isScrolling ? { _tag: 'Icon' } : { _tag: 'Extended' },
    layOutHeadline: (height) => Own.HeadlineLaidOut({ height }),
    layOutList: (height) => Own.ListLaidOut({ height }),
    sizeContent: (height) => Own.ContentSized({ height }),
    scroll: (top) => Own.Scrolled({ top }),
    startScroll: Own.ScrollStarted(),
    endScroll: Own.ScrollEnded(),
    products: children.Products(state),
  }),
})

export type Message = Tea.MessageOf<typeof program>

export type Command = Tea.CommandOf<typeof program>
