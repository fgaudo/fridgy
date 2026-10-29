// The page: its child (the products), and what is the page's own (the top app bar's menu, the back button, the
// ways to the pages that add and edit products, and the scrolling, which the top app bar and the add button follow).
import * as Tea from '@fgaudo/effect-tea'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Optic from 'effect/Optic'
import * as Opt from 'effect/Option'
import type * as Product from '#domain/product.ts'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import * as Products from './children/products/program.ts'
import { Position, Viewport } from './services/viewport/viewport.ts'

export type State = Readonly<{
  isMenuOpen: boolean
  position: Position
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
  PositionChanged: { position: Position }
  InteractionChanged: { isInteracting: boolean }
}>

const Own = Data.taggedEnum<Own>()

/** The page's own commands: its child's are made by `compose`. */
type OwnCommand = Data.TaggedEnum<{
  ExpandBar: object
  CollapseBar: object
}>

const OwnCommand = Data.taggedEnum<OwnCommand>()

export type Event = Data.TaggedEnum<{
  InfoRequested: object
  AddRequested: object
  /** A product of the list, to be edited. */
  EditRequested: { id: string; product: Product.Product }
}>

const Event = Data.taggedEnum<Event>()

export type Deps = Viewport | BackButton | Products.Deps

export type Model = Readonly<{
  menu: Data.TaggedEnum<{
    Closed: { open: Own }
    Open: { close: Own; requestInfo: Own }
  }>
  add: Own
  /** The add button shrinks while the user scrolls. */
  isInteracting: boolean
  products: Products.Model
}>

const scrolling: Tea.Subscription<Own, Viewport> = Channel.unwrap(
  Effect.map(
    Effect.service(Viewport),
    ({ isScrolling }) => Channel.map(isScrolling, (isInteracting) => Own.InteractionChanged({ isInteracting })),
  ),
)

const scrollPosition: Tea.Subscription<Own, Viewport> = Channel.unwrap(
  Effect.map(
    Effect.service(Viewport),
    ({ position }) => Channel.map(position, (position) => Own.PositionChanged({ position })),
  ),
)

// Observed only while the menu is open: otherwise the button is the list's while it shows a selection, or the
// platform's, which leaves the app.
const backButton: Tea.Subscription<Own, BackButton> = Channel.unwrap(
  Effect.map(Effect.service(BackButton), ({ presses }) => Channel.map(presses, () => Own.BackPressed())),
)

const always: HashMap.HashMap<string, Tea.Subscription<Own, Deps>> = HashMap.make(
  ['scrolling', scrolling],
  ['position', scrollPosition],
)

const expandBar = Effect.fn('ExpandBar')(
  function*() {
    const { expandBar } = yield* Viewport
    yield* expandBar
    return Opt.none()
  },
  Effect.withLogSpan('ExpandBar'),
)

const collapseBar = Effect.fn('CollapseBar')(
  function*() {
    const { collapseBar } = yield* Viewport
    yield* collapseBar
    return Opt.none()
  },
  Effect.withLogSpan('CollapseBar'),
)

// As Material's top app bar, a scroll never ends with the bar half collapsed: it snaps to the nearer shape.
const snap = (position: Position): ReadonlyArray<OwnCommand> =>
  Match.valueTags(position, {
    Expanded: () => [],
    CloserToExpanded: () => [OwnCommand.ExpandBar()],
    CloserToCollapsed: () => [OwnCommand.CollapseBar()],
    Collapsed: () => [],
  })

const { child, compose } = Tea.parent<{ state: State; command: OwnCommand; event: Event }>()

// The part is always there: only its subscriptions could be turned off.
export const program = compose({
  init: (children) => {
    const products = children.Products.init
    return {
      state: { isMenuOpen: false, position: Position.Expanded(), isInteracting: false, products: products.state },
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
      BackPressed: () =>
        state.isMenuOpen
          ? { state: { ...state, isMenuOpen: false } }
          : Tea.defect('BackPressed with the menu closed: the button is observed only while it is open'),
      PositionChanged: ({ position }) => ({ state: { ...state, position } }),
      InteractionChanged: ({ isInteracting }) => ({
        state: { ...state, isInteracting },
        commands: isInteracting ? [] : snap(state.position),
      }),
    }),
  runCommand: Match.typeTags<OwnCommand>()({ ExpandBar: expandBar, CollapseBar: collapseBar }),
  subscriptions: (state) => state.isMenuOpen ? HashMap.set(always, 'back-button', backButton) : always,
  makeModel: (state, children): Model => ({
    menu: state.isMenuOpen
      ? { _tag: 'Open', close: Own.MenuClosed(), requestInfo: Own.InfoRequested() }
      : { _tag: 'Closed', open: Own.MenuOpened() },
    add: Own.AddRequested(),
    isInteracting: state.isInteracting,
    products: children.Products(state),
  }),
})

export type Message = Tea.MessageOf<typeof program>

export type Command = Tea.CommandOf<typeof program>
