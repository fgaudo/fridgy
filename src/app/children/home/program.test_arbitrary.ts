import * as Data from 'effect/Data'
import * as fc from 'fast-check'
import * as Products from './children/products/program.test_arbitrary.ts'
import type * as ProductsProgram from './children/products/program.ts'
import type { Message, State } from './program.ts'

type ProductsMessage = ProductsProgram.Message

// A child's message as the page receives it: the library makes it, the test builds it.
const fromProducts = (message: ProductsMessage): Message => ({ _tag: 'Products', message })

const Msg = Data.taggedEnum<Message>()

/** The page's inputs, which its list writes as it is laid out and scrolled. */
type InputName = Extract<Message, Readonly<{ message: Readonly<{ _tag: 'Written' }> }>>['_tag']

/** A write into one of the page's inputs, as the view makes it. */
export const written = (name: InputName, value: number): Message => ({
  _tag: name,
  message: { _tag: 'Written', value },
})

/** A height, as a layout gives it. */
export const height = fc.integer({ min: 0, max: 400 })

/** A scroll's distance from the top, a little past it too. */
export const top = fc.integer({ min: -10, max: 10_000 })

/** Any layout of the list, laid out or not. */
const layout = fc.record({ headline: height, list: height, content: fc.integer({ min: 0, max: 2_000 }) })

/** A collapse of the bar, in twentieths. */
const collapse = fc.integer({ min: 0, max: 20 }).map((step) => step / 20)

/** Any state of the page. The bar collapses only once the headline is laid out. */
export const state: fc.Arbitrary<State> = fc.record({
  isMenuOpen: fc.boolean(),
  layout,
  collapse,
  rest: top,
  generation: fc.nat({ max: 5 }),
  isScrolling: fc.boolean(),
  products: Products.state,
}).map((state) => state.layout.headline > 0 ? state : { ...state, collapse: 0 })

/** Any message of the page, the writes into its inputs included. */
export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.constant(Msg.MenuOpened()),
  fc.constant(Msg.MenuClosed()),
  fc.constant(Msg.InfoRequested()),
  fc.constant(Msg.AddRequested()),
  fc.constant(Msg.BackPressed()),
  height.map((height) => written('HeadlineHeight', height)),
  height.map((height) => written('ListHeight', height)),
  height.map((height) => written('ContentHeight', height)),
  top.map((top) => written('Scroll', top)),
  fc.constant(Msg.ScrollStarted()),
  fc.constant(Msg.ScrollEnded()),
  top.map((top) => written('Rest', top)),
  Products.message.map(fromProducts),
)
