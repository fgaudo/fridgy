import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Stream from 'effect/Stream'

export class Viewport extends Context.Service<
  Viewport,
  {
    readonly isScrolling: Stream.Stream<boolean>
    /** Event: the vertical scroll offset, emitted on subscription and on every scroll. */
    readonly scrollY: Stream.Stream<number>
    readonly scrollToTop: Effect.Effect<void>
  }
>()('e68a4759d6d50ba3') {}
