import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Stream from 'effect/Stream'
import { ProductList } from '../ports/product-list.ts'
import { Viewport } from '../ports/viewport.ts'
import type * as Engine from '@/libs/elm/engine.ts'
import { Message } from './messages.ts'
import type { State } from './state.ts'

export type Deps = ProductList | Viewport

const CLOSE_TO_TOP_THRESHOLD = 30

const fromViewport = <A>(f: (viewport: Viewport['Service']) => Stream.Stream<A>) =>
  Stream.unwrap(Effect.map(Effect.service(Viewport), f))

export const subscriptions: Engine.Emitter<State, Message, Deps> = (_state) =>
  HashMap.make(
    [
      // Expiration statuses derive from the current time: it is refreshed
      // often enough for days-long expirations.
      'clock',
      Stream.tick('30 seconds').pipe(
        Stream.mapEffect(() => DateTime.now),
        Stream.map((now) => Message.TimeChanged({ now })),
      ),
    ],
    [
      'products',
      Stream.unwrap(Effect.map(Effect.service(ProductList), ({ changes }) => changes)).pipe(
        Stream.map((result) => Message.ProductsChanged({ result })),
      ),
    ],
    [
      'scrolling',
      fromViewport(({ isScrolling }) => isScrolling).pipe(
        Stream.map((isInteracting) => Message.InteractionChanged({ isInteracting })),
      ),
    ],
    [
      'at-top',
      fromViewport(({ scrollY }) => scrollY).pipe(
        Stream.map((y) => y === 0),
        Stream.changes,
        Stream.map((isAtTop) => Message.ViewportAtTopChanged({ isAtTop })),
      ),
    ],
    [
      'close-to-top',
      fromViewport(({ scrollY }) => scrollY).pipe(
        Stream.map((y) => y <= CLOSE_TO_TOP_THRESHOLD),
        Stream.changes,
        Stream.map((isCloseToTop) => Message.ViewportCloseToTopChanged({ isCloseToTop })),
      ),
    ],
  )
