// The page: its parts, and what spans them (the side menu, the back button, the
// toasts that say a part failed).
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as AddProduct from './parts/add-product.ts'
import * as Products from './parts/products.ts'
import * as Scrolling from './parts/scrolling.ts'
import type { ProductCommands } from '#app/ports/product-commands.ts'
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

export type Message =
  | ExternalMessage
  | Data.TaggedEnum<{
    MenuOpened: object
    MenuClosed: object
    InfoRequested: object
    Scrolling: { message: Scrolling.Message }
    AddProduct: { message: AddProduct.Message }
    Products: { message: Products.Message }
  }>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{
  ShowToast: { text: string }
  Scrolling: { command: Scrolling.Command }
  AddProduct: { command: AddProduct.Command }
  Products: { command: Products.Command }
}>

const Command = Data.taggedEnum<Command>()

export type Event = Data.TaggedEnum<{
  InfoRequested: object
  /** Nothing left to close: the page should be left. */
  LeaveRequested: object
}>

const Event = Data.taggedEnum<Event>()

export type Deps = Notifications | Viewport | ProductCommands | ProductList

export type Model = Readonly<{
  menu: Data.TaggedEnum<{
    Closed: { open: Tea.Offered<Message> }
    Open: { close: Tea.Offered<Message>; requestInfo: Tea.Offered<Message> }
  }>
  scrolling: Scrolling.Model
  addProduct: AddProduct.Model
  products: Products.Model
}>

type Step = Tea.Step<State, Command, Event>

// The same wraps for `embed` and the view's `mapDispatch`: a part's offered
// messages stay offered only when both wrap them alike.
export const fromAddProduct = (message: AddProduct.Message) => Message.AddProduct({ message })

export const fromProducts = (message: Products.Message) => Message.Products({ message })

const toast = (text: string) => (state: State): Step => ({ state, commands: [Command.ShowToast({ text })] })

// Each part is always there: only its subscriptions could be turned off.
const scrolling = Tea.embed(Scrolling.program, {
  key: 'scrolling',
  wrap: (message) => Message.Scrolling({ message }),
  wrapCommand: (command) => Command.Scrolling({ command }),
  get: (state: State) => Opt.some(state.scrolling),
  set: (state, scrolling) => ({ ...state, scrolling }),
})

const addProduct = Tea.embed(AddProduct.program, {
  key: 'add-product',
  wrap: fromAddProduct,
  wrapCommand: (command) => Command.AddProduct({ command }),
  get: (state: State) => Opt.some(state.addProduct),
  set: (state, addProduct) => ({ ...state, addProduct }),
  onEvent: Match.typeTags<AddProduct.Event>()({
    Failed: () => toast('Could not add the product'),
    NothingToClose: () => (state: State): Step => ({ state, events: [Event.LeaveRequested()] }),
  }),
})

const products = Tea.embed(Products.program, {
  key: 'products',
  wrap: fromProducts,
  wrapCommand: (command) => Command.Products({ command }),
  get: (state: State) => Opt.some(state.products),
  set: (state, products) => ({ ...state, products }),
  onEvent: () => toast('Could not delete the products'),
})

export const program: Tea.Program<State, Model, Message, Command, Deps, Event> = {
  init: {
    state: {
      isMenuOpen: false,
      scrolling: Scrolling.program.init.state,
      addProduct: AddProduct.program.init.state,
      products: Products.program.init.state,
    },
  },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    MenuOpened: () => (state) => !state.isMenuOpen ? { state: { ...state, isMenuOpen: true } } : Tea.reject,

    MenuClosed: () => (state) => state.isMenuOpen ? { state: { ...state, isMenuOpen: false } } : Tea.reject,

    // Asked from the side menu, which closes on the way.
    InfoRequested: () => (state) =>
      state.isMenuOpen
        ? { state: { ...state, isMenuOpen: false }, events: [Event.InfoRequested()] }
        : Tea.reject,

    // Closes what is open, innermost first: the menu, then the form, which asks
    // to leave the page when it has nothing to close.
    BackPressed: () => (state) =>
      state.isMenuOpen
        ? { state: { ...state, isMenuOpen: false } }
        : addProduct.update(AddProduct.ExternalMessage.BackPressed())(state),

    Scrolling: ({ message }) => scrolling.update(message),

    AddProduct: ({ message }) => addProduct.update(message),

    Products: ({ message }) => products.update(message),
  }),

  runCommand: Match.typeTags<Command>()({
    ShowToast: Effect.fn(function*({ text }) {
      const { showToast } = yield* Notifications
      yield* showToast(text).pipe(
        Effect.catchTag('NotificationError', (error) => Effect.logWarning('Could not show toast', error.cause)),
      )
      return Opt.none()
    }),
    Scrolling: ({ command }) => scrolling.runCommand(command),
    AddProduct: ({ command }) => addProduct.runCommand(command),
    Products: ({ command }) => products.runCommand(command),
  }),

  subscriptions: (state) => HashMap.union(scrolling.subscriptions(state), products.subscriptions(state)),

  makeModel: (state, { offer }) => ({
    menu: state.isMenuOpen
      ? { _tag: 'Open', close: offer(Message.MenuClosed()), requestInfo: offer(Message.InfoRequested()) }
      : { _tag: 'Closed', open: offer(Message.MenuOpened()) },
    scrolling: scrolling.makeModel(state.scrolling),
    addProduct: addProduct.makeModel(state.addProduct),
    products: products.makeModel(state.products),
  }),
}
