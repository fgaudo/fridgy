import * as Data from 'effect/Data'
import * as fc from 'fast-check'
import * as Products from './children/products/program.test_arbitrary.ts'
import type * as ProductsProgram from './children/products/program.ts'
import type { Message, State } from './program.ts'

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

/** Any state of the page. */
export const state: fc.Arbitrary<State> = fc.record({
  isMenuOpen: fc.boolean(),
  layout,
  collapse,
  rest: top,
  generation: fc.nat({ max: 5 }),
  isScrolling: fc.boolean(),
  products: Products.state,
})

/** Any message of the page. */
export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.constant(Msg.MenuOpened()),
  fc.constant(Msg.MenuClosed()),
  fc.constant(Msg.InfoRequested()),
  fc.constant(Msg.AddRequested()),
  fc.constant(Msg.BackPressed()),
  height.map((height) => Msg.HeadlineLaidOut({ height })),
  height.map((height) => Msg.ListLaidOut({ height })),
  height.map((height) => Msg.ContentSized({ height })),
  top.map((top) => Msg.Scrolled({ top })),
  fc.constant(Msg.ScrollStarted()),
  top.map((top) => Msg.ScrollEnded({ top })),
  Products.message.map(fromProducts),
)
