import * as Data from 'effect/Data'
import * as fc from 'fast-check'
import * as Products from './children/products/program.test_arbitrary.ts'
import type * as ProductsProgram from './children/products/program.ts'
import type { Message, State } from './program.ts'
import { Position } from './services/viewport/viewport.ts'

type ProductsMessage = ProductsProgram.Message

// A child's message as the page receives it: the library makes it, the test builds it.
const fromProducts = (message: ProductsMessage): Message => ({ _tag: 'Products', message })

const Msg = Data.taggedEnum<Message>()

/** Any position of the page along the top app bar's collapse. */
export const position: fc.Arbitrary<Position> = fc.constantFrom(
  Position.Expanded(),
  Position.CloserToExpanded(),
  Position.CloserToCollapsed(),
  Position.Collapsed(),
)

/** Any state of the page. */
export const state: fc.Arbitrary<State> = fc.record({
  isMenuOpen: fc.boolean(),
  position: position,
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
  position.map((position) => Msg.PositionChanged({ position })),
  fc.boolean().map((isInteracting) => Msg.InteractionChanged({ isInteracting })),
  Products.message.map(fromProducts),
)
