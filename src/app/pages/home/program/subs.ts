import * as Channel from 'effect/Channel'
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
const clock: Tea.Subscription<Message, never> = Channel.forever(
  Channel.fromEffect(DateTime.now).pipe(
    Channel.map((now) => Message.TimeChanged({ now })),
    Channel.concatWith(() => Channel.fromEffectDrain(Effect.sleep('30 seconds'))),
  ),
)

const products: Tea.Subscription<Message, ProductList> = Channel.unwrap(
  Effect.map(
    Effect.service(ProductList),
    ({ changes }) => Channel.map(changes, (result) => Message.ProductsChanged({ result })),
  ),
)

const scrolling: Tea.Subscription<Message, Viewport> = Channel.unwrap(
  Effect.map(
    Effect.service(Viewport),
    ({ isScrolling }) => Channel.map(isScrolling, (isInteracting) => Message.InteractionChanged({ isInteracting })),
  ),
)

const atTop: Tea.Subscription<Message, Viewport> = Channel.unwrap(
  Effect.map(
    Effect.service(Viewport),
    ({ isNearTop }) => Channel.map(isNearTop(0), (isAtTop) => Message.ViewportAtTopChanged({ isAtTop })),
  ),
)

const closeToTop: Tea.Subscription<Message, Viewport> = Channel.unwrap(
  Effect.map(
    Effect.service(Viewport),
    ({ isNearTop }) =>
      Channel.map(
        isNearTop(CLOSE_TO_TOP_THRESHOLD),
        (isCloseToTop) => Message.ViewportCloseToTopChanged({ isCloseToTop }),
      ),
  ),
)

export const subscriptions: Tea.Subscribe<State, Message, Deps> = (_state) =>
  HashMap.make(
    ['clock', clock],
    ['products', products],
    ['scrolling', scrolling],
    ['at-top', atTop],
    ['close-to-top', closeToTop],
  )
