// The page: its parts, and what spans them (the side menu, the back button, the
// toasts that say a part failed).
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type { ProductCommands } from '#app/ports/product-commands.ts'
import * as AddProduct from './parts/add-product.ts'
import * as Products from './parts/products.ts'
import * as Scrolling from './parts/scrolling.ts'
import { Notifications } from './ports/notifications.ts'
import type { ProductList } from './ports/product-list.ts'
import type { Viewport } from './ports/viewport.ts'

export type State = Readonly<{
  isMenuOpen: boolean
  scrolling: Scrolling.State
  addProduct: AddProduct.State
  products: Products.State
}>

export type ExternalMessage = Data.TaggedEnum<{
  /** Android's back button, while the page is shown. */
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
  }>

const Own = Data.taggedEnum<Own>()

type ShowToast = Readonly<{ _tag: 'ShowToast'; text: string }>

export type Event = Data.TaggedEnum<{
  InfoRequested: object
  /** Nothing left to close: the page should be left. */
  LeaveRequested: object
}>

const Event = Data.taggedEnum<Event>()

export type Deps = Notifications | Viewport | ProductCommands | ProductList

export type Model = Readonly<{
  menu: Data.TaggedEnum<{
    Closed: { open: Own }
    Open: { close: Own; requestInfo: Own }
  }>
  scrolling: Scrolling.Model
  addProduct: AddProduct.Model
  products: Products.Model
}>

const toast = (text: string): ShowToast => ({ _tag: 'ShowToast', text })

const { child, compose } = Tea.parent<{ state: State; command: ShowToast; event: Event; external: ExternalMessage }>()

// Each part is always there: only its subscriptions could be turned off.
export const program = compose({
  init: (children) => {
    const scrolling = children.Scrolling.init
    const addProduct = children.AddProduct.init
    const products = children.Products.init
    return {
      state: { isMenuOpen: false, scrolling: scrolling.state, addProduct: addProduct.state, products: products.state },
      commands: [...scrolling.commands, ...addProduct.commands, ...products.commands],
    }
  },
  children: {
    Scrolling: child(Scrolling.program, {
      get: (state) => Opt.some(state.scrolling),
      set: (state, scrolling) => ({ ...state, scrolling }),
    }),
    AddProduct: child(AddProduct.program, {
      get: (state) => Opt.some(state.addProduct),
      set: (state, addProduct) => ({ ...state, addProduct }),
    }),
    Products: child(Products.program, {
      get: (state) => Opt.some(state.products),
      set: (state, products) => ({ ...state, products }),
    }),
  },
  update: (message: Own, children) => (state) =>
    Match.valueTags(message, {
      MenuOpened: () => !state.isMenuOpen ? { state: { ...state, isMenuOpen: true } } : Tea.reject,
      MenuClosed: () => state.isMenuOpen ? { state: { ...state, isMenuOpen: false } } : Tea.reject,
      // Asked from the side menu, which closes on the way.
      InfoRequested: () =>
        state.isMenuOpen
          ? { state: { ...state, isMenuOpen: false }, events: [Event.InfoRequested()] }
          : Tea.reject,
      // Closes what is open, innermost first: the menu, then the form, which asks
      // to leave the page when it has nothing to close.
      BackPressed: () =>
        state.isMenuOpen
          ? { state: { ...state, isMenuOpen: false } }
          : children.AddProduct.update(AddProduct.ExternalMessage.BackPressed())(state),
    }),
  onEvent: {
    AddProduct: (event) => (state) =>
      Match.valueTags(event, {
        Failed: () => ({ state, commands: [toast('Could not add the product')] }),
        NothingToClose: () => ({ state, events: [Event.LeaveRequested()] }),
      }),
    Products: () => (state) => ({ state, commands: [toast('Could not delete the products')] }),
  },
  runCommand: Effect.fn(function*({ text }: ShowToast) {
    const { showToast } = yield* Notifications
    yield* showToast(text).pipe(
      Effect.catchTag('NotificationError', (error) => Effect.logWarning('Could not show toast', error.cause)),
    )
    return Opt.none()
  }),
  makeModel: (state, children): Model => ({
    menu: state.isMenuOpen
      ? { _tag: 'Open', close: Own.MenuClosed(), requestInfo: Own.InfoRequested() }
      : { _tag: 'Closed', open: Own.MenuOpened() },
    scrolling: children.Scrolling(state),
    addProduct: children.AddProduct(state),
    products: children.Products(state),
  }),
})

export type Message = Tea.MessageOf<typeof program>

export type Command = Tea.CommandOf<typeof program>
