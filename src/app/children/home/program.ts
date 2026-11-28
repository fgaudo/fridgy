// The page: its child (the products), and what is the page's own (the top app bar's menu, the ways to the pages that
// add and edit products, and the scrolling, which the top app bar and the add button follow). A press of the back
// button is Home's while it has something to close, which its output says.
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as Equal from 'effect/Equal'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type * as Product from '#domain/product.ts'
import * as Products from './children/products/program.ts'

/**
 * The heights the list's layout gives, 0 until it gives them: its headline's, its own and its content's. The messages
 * `HeadlineLaidOut`, `ListLaidOut` and `ContentSized`.
 */
export type Layout = Readonly<{ headline: number; list: number; content: number }>

export type State = Readonly<{
  isMenuOpen: boolean
  layout: Layout
  /**
   * How far the top app bar has collapsed, from 0 to 1, as its headline, the top of the list, scrolls out of view
   * (`docs/motion.md`, "Home's top app bar and its FAB"). In twentieths. The message `Scrolled`.
   */
  collapse: number
  /** Where the list last came to rest, from the top: the message `ScrollEnded`. */
  rest: number
  /** Counts the times the list was drawn anew, at its top. */
  generation: number
  /** From the drag to the end of its momentum. */
  isScrolling: boolean
}>

/** The page's own messages: its child's are made by `withChildren`. */
type Own = Data.TaggedEnum<{
  // From the view.
  MenuOpened: object
  MenuClosed: object
  InfoRequested: object
  AddRequested: object
  ScrollStarted: object
  /** How far the list has scrolled, in pixels from its top. */
  Scrolled: { offset: number }
  /** The end of the scroll's momentum, with where the list rests. */
  ScrollEnded: { offset: number }
  HeadlineLaidOut: { height: number }
  ListLaidOut: { height: number }
  ContentSized: { height: number }
}>

const Own = Data.taggedEnum<Own>()

export type Event = Data.TaggedEnum<{
  InfoRequested: object
  AddRequested: object
  /** A product of the list, to be edited. */
  EditRequested: { id: Product.ProductId; product: Product.Product }
}>

const Event = Data.taggedEnum<Event>()

/** The platform's back button, which the root tells while the output says that a press is Home's. */
export type External = Readonly<{ _tag: 'BackPressed' }>

/** Whether a press of the back button is Home's: while its menu is open, or its list shows a selection. */
export type Output = Readonly<{ takesBack: boolean }>

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
  /** Only while the user is not already scrolling. */
  maybeStartScroll: Opt.Option<Own>
  // Filled by the view with what the list reports.
  scrolled: Readonly<{ _tag: 'Scrolled' }>
  scrollEnded: Readonly<{ _tag: 'ScrollEnded' }>
  headlineLaidOut: Readonly<{ _tag: 'HeadlineLaidOut' }>
  listLaidOut: Readonly<{ _tag: 'ListLaidOut' }>
  contentSized: Readonly<{ _tag: 'ContentSized' }>
  products: Products.Model
}>

// Each step draws a frame: twenty are a fade, and leave the frames between them to the scroll.
const steps = 20

// Rounded, so that a snap that lands a device pixel short of the headline's end collapses it whole.
const collapseAt = (top: number, { headline }: Layout) =>
  headline > 0 ? Math.round(Math.min(Math.max(top / headline, 0), 1) * steps) / steps : 0

/**
 * A new layout, which Android follows with no scroll event. A new size of the screen or of the font moves the scroll
 * where nothing tells: the list is drawn anew at its top, and the bar expands. A list that gets shorter is pulled back
 * within its end: the bar collapses no further than the list can scroll. The layout it already has is the very same
 * state.
 */
const laidOut = (state: State, layout: Layout): State => {
  if (Equal.equals(layout, state.layout)) {
    return state
  }
  const isResized = layout.headline !== state.layout.headline || layout.list !== state.layout.list
  if (isResized && state.collapse > 0) {
    return { ...state, layout, collapse: 0, rest: 0, generation: state.generation + 1 }
  }
  return { ...state, layout, collapse: Math.min(state.collapse, collapseAt(layout.content - layout.list, layout)) }
}

const { withChildren } = Tea.program<{
  state: State
  model: Model
  message: Own
  event: Event
  external: External
  output: Output
}>()

export const program = withChildren({
  // Always there: only its subscriptions are turned off, by Home's parent.
  Products: Tea.child(Products.program),
}).make({
  init: {
    state: {
      isMenuOpen: false,
      layout: { headline: 0, list: 0, content: 0 },
      collapse: 0,
      rest: 0,
      generation: 0,
      isScrolling: false,
    },
  },
  onEvent: {
    Products: (event) => (state) => ({ state, events: [event] }),
  },
  // What is on top closes first: the menu, then the list's selection.
  external: (_, children) => (state) =>
    state.isMenuOpen
      ? { state: { ...state, isMenuOpen: false } }
      : children.Products.output().takesBack
      ? { state, tell: [{ _tag: 'Products', message: { _tag: 'BackPressed' } }] }
      : Tea.defect('BackPressed with nothing to close: the root tells the press only while the output says so'),
  output: (state, children) => ({ takesBack: state.isMenuOpen || children.Products.output().takesBack }),
  // The list reports its scroll and its layout at every event, and most change nothing: those keep the very same
  // state, so that no frame is drawn.
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
      ScrollStarted: () => state.isScrolling ? Tea.reject : { state: { ...state, isScrolling: true } },
      // As far as the bar's collapse tells it apart.
      Scrolled: ({ offset }) => {
        const collapse = collapseAt(offset, state.layout)
        return { state: collapse === state.collapse ? state : { ...state, collapse } }
      },
      ScrollEnded: ({ offset }) => ({
        state: offset === state.rest && !state.isScrolling ? state : { ...state, rest: offset, isScrolling: false },
      }),
      HeadlineLaidOut: ({ height }) => ({ state: laidOut(state, { ...state.layout, headline: height }) }),
      ListLaidOut: ({ height }) => ({ state: laidOut(state, { ...state.layout, list: height }) }),
      ContentSized: ({ height }) => ({ state: laidOut(state, { ...state.layout, content: height }) }),
    }),
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
    maybeStartScroll: state.isScrolling ? Opt.none() : Opt.some(Own.ScrollStarted()),
    scrolled: { _tag: 'Scrolled' },
    scrollEnded: { _tag: 'ScrollEnded' },
    headlineLaidOut: { _tag: 'HeadlineLaidOut' },
    listLaidOut: { _tag: 'ListLaidOut' },
    contentSized: { _tag: 'ContentSized' },
    products: children.Products(),
  }),
})

export type Message = Tea.MessageOf<typeof program>

export type Command = Tea.CommandOf<typeof program>
