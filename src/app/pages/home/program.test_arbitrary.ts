import * as Data from 'effect/Data'
import * as fc from 'fast-check'
import * as AddProduct from './parts/add-product.test_arbitrary.ts'
import * as Products from './parts/products.test_arbitrary.ts'
import { fromAddProduct, fromProducts, type Message, type State } from './program.ts'

const Msg = Data.taggedEnum<Message>()

/** Any state of the page. */
export const state: fc.Arbitrary<State> = fc.record({
  isMenuOpen: fc.boolean(),
  scrolling: fc.record({ isAtTop: fc.boolean(), isInteracting: fc.boolean() }),
  addProduct: AddProduct.state,
  products: Products.state,
})

/** Any message of the page, but the scrolling ones: that part has its own tests and rejects nothing. */
export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.constant(Msg.MenuOpened()),
  fc.constant(Msg.MenuClosed()),
  fc.constant(Msg.InfoRequested()),
  fc.constant(Msg.BackPressed()),
  AddProduct.message.map(fromAddProduct),
  Products.message.map(fromProducts),
)
