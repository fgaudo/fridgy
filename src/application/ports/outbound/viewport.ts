import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class Viewport extends Context.Service<
  Viewport,
  {
    scrollTo: (opt: ScrollToOptions) => Effect.Effect<void>
  }
>()('e1880b5e7e8a0ddc') {}
