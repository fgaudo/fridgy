// The page: its parts, and what spans them (the side menu, the back button, the
// way to the page that adds products).
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Products from './parts/products/products.ts'
import * as Scrolling from './parts/scrolling/scrolling.ts'
import type { DeleteProducts } from './parts/products/services/delete-products/delete-products.ts'
import type { Notifications } from './parts/products/services/notifications/notifications.ts'
import type { ProductList } from './parts/products/services/product-list/product-list.ts'
import type { Viewport } from './parts/scrolling/services/viewport/viewport.ts'

export type State = Readonly<{
  isMenuOpen: boolean
  scrolling: Scrolling.State
  products: Products.State
}>

export type ExternalMessage = Data.TaggedEnum<{
  /** The back button, while the page is shown and `handlesBack`. */
  BackPressed: object
}>

export const ExternalMessage = Data.taggedEnum<ExternalMessage>()

/** The page's own messages: its parts' are made by `compose`. */
type Own =
  | ExternalMessage
  | Data.TaggedEnum<{
    MenuOpened: object
    MenuClosed: object
    InfoRequested: object
    AddRequested: object
  }>

const Own = Data.taggedEnum<Own>()

export type Event = Data.TaggedEnum<{
  InfoRequested: object
  AddRequested: object
}>

const Event = Data.taggedEnum<Event>()

/** Whether the back button is the page's: otherwise `BackPressed` changes nothing. */
export const handlesBack = (state: State): boolean => state.isMenuOpen

export type Deps = Viewport | DeleteProducts | ProductList | Notifications

export type Model = Readonly<{
  menu: Data.TaggedEnum<{
    Closed: { open: Own }
    Open: { close: Own; requestInfo: Own }
  }>
  add: Own
  scrolling: Scrolling.Model
  products: Products.Model
}>

const { child, compose } = Tea.parent<{ state: State; event: Event; external: ExternalMessage }>()

// Each part is always there: only its subscriptions could be turned off.
export const program = compose({
  init: (children) => {
    const scrolling = children.Scrolling.init
    const products = children.Products.init
    return {
      state: { isMenuOpen: false, scrolling: scrolling.state, products: products.state },
      commands: [...scrolling.commands, ...products.commands],
    }
  },
  children: {
    Scrolling: child(Scrolling.program, {
      get: (state) => Opt.some(state.scrolling),
      set: (state, scrolling) => ({ ...state, scrolling }),
    }),
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
      BackPressed: () => state.isMenuOpen ? { state: { ...state, isMenuOpen: false } } : { state },
    }),
  makeModel: (state, children): Model => ({
    menu: state.isMenuOpen
      ? { _tag: 'Open', close: Own.MenuClosed(), requestInfo: Own.InfoRequested() }
      : { _tag: 'Closed', open: Own.MenuOpened() },
    add: Own.AddRequested(),
    scrolling: children.Scrolling(state),
    products: children.Products(state),
  }),
})

export type Message = Tea.MessageOf<typeof program>

export type Command = Tea.CommandOf<typeof program>
