import type * as Tea from '@fgaudo/effect-tea'
import { stateOf } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as fc from 'fast-check'
import * as Products from './children/products/program.test_arbitrary.ts'
import type * as ProductsProgram from './children/products/program.ts'
import { type Message, program, type State } from './program.ts'

type ProductsMessage = ProductsProgram.Message

// A child's message as the page receives it: the library makes it, the test builds it.
const fromProducts = (message: ProductsMessage): Message => ({ _tag: 'Products', message })

const Msg = Data.taggedEnum<Message>()

/** A height, as a layout gives it. */
export const height = fc.integer({ min: 0, max: 400 })

/** A scroll's distance from the top, a little past it too. */
export const top = fc.integer({ min: -10, max: 10_000 })

/** Any layout of the list, laid out or not. */
const layout = fc.record({ headline: height, list: height, content: fc.integer({ min: 0, max: 2_000 }) })

/** A collapse of the bar, in twentieths. */
const collapse = fc.integer({ min: 0, max: 20 }).map((step) => step / 20)

/** Any state of the page's own. The bar collapses only once the headline is laid out. */
export const own: fc.Arbitrary<State> = fc.record({
  isMenuOpen: fc.boolean(),
  layout,
  collapse,
  rest: top,
  generation: fc.nat({ max: 5 }),
  isScrolling: fc.boolean(),
}).map((state) => state.layout.headline > 0 ? state : { ...state, collapse: 0 })

/** The page's whole state: its own, and its child's. */
export type Whole = Tea.StateOf<typeof program>

/** The whole states of those own states, with any state of the products. */
export const wholeOf = (owns: fc.Arbitrary<State>): fc.Arbitrary<Whole> =>
  fc.tuple(owns, Products.state).map(([own, products]) => stateOf(program, own, { Products: products }))

/** Any state of the page. */
export const state: fc.Arbitrary<Whole> = wholeOf(own)

/** What the list reports of its layout and its scroll, with the value it gives. */
export const reported: fc.Arbitrary<Message> = fc.oneof(
  height.map((height) => Msg.HeadlineLaidOut({ height })),
  height.map((height) => Msg.ListLaidOut({ height })),
  height.map((height) => Msg.ContentSized({ height })),
  top.map((offset) => Msg.Scrolled({ offset })),
  top.map((offset) => Msg.ScrollEnded({ offset })),
)

/** Any message of the page, its child's included. */
export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.constant(Msg.MenuOpened()),
  fc.constant(Msg.MenuClosed()),
  fc.constant(Msg.InfoRequested()),
  fc.constant(Msg.AddRequested()),
  fc.constant(Msg.BackPressed()),
  fc.constant(Msg.ScrollStarted()),
  reported,
  Products.message.map(fromProducts),
)
