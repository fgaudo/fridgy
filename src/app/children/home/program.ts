// The page: its child (the products), and what is the page's own (the side menu, the back button, the way to the
// page that adds products, and the scrolling, which the top app bar and the add button follow).
import * as Tea from '@fgaudo/effect-tea'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import { defect } from '#libs/defect/defect.ts'
import * as Products from './children/products/program.ts'
import { Viewport } from './services/viewport/viewport.ts'

export type State = Readonly<{
  isMenuOpen: boolean
  isAtTop: boolean
  isInteracting: boolean
  products: Products.State
}>

/** The page's own messages: its child's are made by `compose`. */
type Own = Data.TaggedEnum<{
  // From the view.
  MenuOpened: object
  MenuClosed: object
  InfoRequested: object
  AddRequested: object
  // From subscriptions.
  /** The back button, heard only while the menu is open, which it closes. */
  BackPressed: object
  AtTopChanged: { isAtTop: boolean }
  CloseToTopChanged: { isCloseToTop: boolean }
  InteractionChanged: { isInteracting: boolean }
}>

const Own = Data.taggedEnum<Own>()

type ScrollToTop = Readonly<{ _tag: 'ScrollToTop' }>

export type Event = Data.TaggedEnum<{
  InfoRequested: object
  AddRequested: object
}>

const Event = Data.taggedEnum<Event>()

export type Deps = Viewport | BackButton | Products.Deps

export type Model = Readonly<{
  menu: Data.TaggedEnum<{
    Closed: { open: Own }
    Open: { close: Own; requestInfo: Own }
  }>
  add: Own
  /** The top app bar takes a container's color once the list scrolls under it. */
  isAtTop: boolean
  /** The add button shrinks while the user scrolls. */
  isInteracting: boolean
  products: Products.Model
}>

const CLOSE_TO_TOP_THRESHOLD = 30

const scrolling: Tea.Subscription<Own, Viewport> = Channel.unwrap(
  Effect.map(
    Effect.service(Viewport),
    ({ isScrolling }) => Channel.map(isScrolling, (isInteracting) => Own.InteractionChanged({ isInteracting })),
  ),
)

const atTop: Tea.Subscription<Own, Viewport> = Channel.unwrap(
  Effect.map(
    Effect.service(Viewport),
    ({ isNearTop }) => Channel.map(isNearTop(0), (isAtTop) => Own.AtTopChanged({ isAtTop })),
  ),
)

const closeToTop: Tea.Subscription<Own, Viewport> = Channel.unwrap(
  Effect.map(
    Effect.service(Viewport),
    ({ isNearTop }) =>
      Channel.map(isNearTop(CLOSE_TO_TOP_THRESHOLD), (isCloseToTop) => Own.CloseToTopChanged({ isCloseToTop })),
  ),
)

// Observed only while the menu is open: otherwise the button is the platform's, which leaves the app.
const backButton: Tea.Subscription<Own, BackButton> = Channel.unwrap(
  Effect.map(Effect.service(BackButton), ({ presses }) => Channel.map(presses, () => Own.BackPressed())),
)

const always: HashMap.HashMap<string, Tea.Subscription<Own, Deps>> = HashMap.make(
  ['scrolling', scrolling],
  ['at-top', atTop],
  ['close-to-top', closeToTop],
)

const scrollToTop = Effect.fn('ScrollToTop')(function*() {
  const { scrollToTop } = yield* Viewport
  yield* scrollToTop
  return Opt.none()
})

const { child, compose } = Tea.parent<{ state: State; command: ScrollToTop; event: Event }>()

// The part is always there: only its subscriptions could be turned off.
export const program = compose({
  init: (children) => {
    const products = children.Products.init
    return {
      state: { isMenuOpen: false, isAtTop: true, isInteracting: false, products: products.state },
      commands: products.commands,
    }
  },
  children: {
    Products: child(Products.program, {
      get: (state) => Opt.some(state.products),
      set: (state, products) => ({ ...state, products }),
    }),
  },
  update: (message: Own) => (state) =>
    Match.valueTags(message, {
      MenuOpened: () => !state.isMenuOpen ? { state: { ...state, isMenuOpen: true } } : Tea.reject,
      MenuClosed: () => state.isMenuOpen ? { state: { ...state, isMenuOpen: false } } : Tea.reject,
      // Asked from the side menu, which closes on the way.
      InfoRequested: () =>
        state.isMenuOpen
          ? { state: { ...state, isMenuOpen: false }, events: [Event.InfoRequested()] }
          : Tea.reject,
      // Each tap asks: the parent opens the page once.
      AddRequested: () => ({ state, events: [Event.AddRequested()] }),
      BackPressed: () =>
        state.isMenuOpen
          ? { state: { ...state, isMenuOpen: false } }
          : defect('BackPressed with the menu closed: the button is observed only while it is open'),
      AtTopChanged: ({ isAtTop }) => ({ state: { ...state, isAtTop } }),
      InteractionChanged: ({ isInteracting }) => ({ state: { ...state, isInteracting } }),
      // Close to the top, the list snaps to it, unless the user is scrolling it.
      CloseToTopChanged: ({ isCloseToTop }) => ({
        state,
        commands: !state.isInteracting && isCloseToTop ? [{ _tag: 'ScrollToTop' } as const] : [],
      }),
    }),
  runCommand: scrollToTop,
  subscriptions: (state) => state.isMenuOpen ? HashMap.set(always, 'back-button', backButton) : always,
  makeModel: (state, children): Model => ({
    menu: state.isMenuOpen
      ? { _tag: 'Open', close: Own.MenuClosed(), requestInfo: Own.InfoRequested() }
      : { _tag: 'Closed', open: Own.MenuOpened() },
    add: Own.AddRequested(),
    isAtTop: state.isAtTop,
    isInteracting: state.isInteracting,
    products: children.Products(state),
  }),
})

export type Message = Tea.MessageOf<typeof program>

export type Command = Tea.CommandOf<typeof program>
