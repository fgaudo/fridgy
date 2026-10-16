import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import type * as Tea from '@fgaudo/effect-tea'
import { ProductList } from '../ports/product-list.ts'
import { Viewport } from '../ports/viewport.ts'
import { Message } from './messages.ts'
import type { State } from './state.ts'

export type Deps = ProductList | Viewport

const CLOSE_TO_TOP_THRESHOLD = 30

// Expiration statuses derive from the current time: it is refreshed often
// enough for days-long expirations.
const clock: Tea.Subscription<Message, never> = (emit) =>
  DateTime.now.pipe(
    Effect.flatMap((now) => emit(Message.TimeChanged({ now }))),
    Effect.andThen(Effect.sleep('30 seconds')),
    Effect.forever,
  )

const products: Tea.Subscription<Message, ProductList> = (emit) =>
  Effect.flatMap(
    Effect.service(ProductList),
    ({ changes }) => changes((result) => emit(Message.ProductsChanged({ result }))),
  )

const scrolling: Tea.Subscription<Message, Viewport> = (emit) =>
  Effect.flatMap(
    Effect.service(Viewport),
    ({ isScrolling }) => isScrolling((isInteracting) => emit(Message.InteractionChanged({ isInteracting }))),
  )

const atTop: Tea.Subscription<Message, Viewport> = (emit) =>
  Effect.flatMap(
    Effect.service(Viewport),
    ({ isNearTop }) => isNearTop(0)((isAtTop) => emit(Message.ViewportAtTopChanged({ isAtTop }))),
  )

const closeToTop: Tea.Subscription<Message, Viewport> = (emit) =>
  Effect.flatMap(
    Effect.service(Viewport),
    ({ isNearTop }) =>
      isNearTop(CLOSE_TO_TOP_THRESHOLD)((isCloseToTop) => emit(Message.ViewportCloseToTopChanged({ isCloseToTop }))),
  )

export const subscriptions: Tea.Emitter<State, Message, Deps> = (_state) =>
  HashMap.make(
    ['clock', clock],
    ['products', products],
    ['scrolling', scrolling],
    ['at-top', atTop],
    ['close-to-top', closeToTop],
  )
