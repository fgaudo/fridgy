import * as Data from 'effect/Data'
import * as fc from 'fast-check'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import * as Products from './children/products/program.test_arbitrary.ts'
import type * as ProductsProgram from './children/products/program.ts'
import type { Message, State } from './program.ts'

type ProductsMessage = ProductsProgram.Message

// A child's message as the page receives it: the library makes it, the test builds it.
const fromProducts = (message: ProductsMessage): Message => ({ _tag: 'Products', message })

const Msg = Data.taggedEnum<Message>()

/** Any state of the page. */
export const state: fc.Arbitrary<State> = fc.record({
  isMenuOpen: fc.boolean(),
  isAtTop: fc.boolean(),
  isInteracting: fc.boolean(),
  products: Products.state,
})

/** Any message of the page. */
export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.constant(Msg.MenuOpened()),
  fc.constant(Msg.MenuClosed()),
  fc.constant(Msg.InfoRequested()),
  fc.constant(Msg.AddRequested()),
  fc.constant(Msg.BackPressed()),
  fc.boolean().map((isAtTop) => Msg.AtTopChanged({ isAtTop })),
  fc.boolean().map((isCloseToTop) => Msg.CloseToTopChanged({ isCloseToTop })),
  fc.boolean().map((isInteracting) => Msg.InteractionChanged({ isInteracting })),
  utc.map((at) => Msg.ProductGone({ at })),
  Products.message.map(fromProducts),
)
