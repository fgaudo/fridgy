import * as Data from 'effect/Data'
import * as fc from 'fast-check'
import * as AddProduct from './parts/add-product.test_arbitrary.ts'
import * as Products from './parts/products.test_arbitrary.ts'
import type * as AddProductProgram from './parts/add-product.ts'
import type * as ProductsProgram from './parts/products.ts'
import type { Message, State } from './program.ts'

type AddProductMessage = AddProductProgram.Message
type ProductsMessage = ProductsProgram.Message

// A part's message as the page receives it: the library makes it, the test builds it.
const fromAddProduct = (message: AddProductMessage): Message => ({ _tag: 'AddProduct', message })

const fromProducts = (message: ProductsMessage): Message => ({ _tag: 'Products', message })

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
