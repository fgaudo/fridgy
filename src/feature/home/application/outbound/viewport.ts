import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class Viewport extends Context.Service<
  Viewport,
  {
    scrollToTop: Effect.Effect<void>
  }
>()('472964882c4aa1e5') {}
