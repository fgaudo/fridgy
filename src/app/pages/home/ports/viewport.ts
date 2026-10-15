import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Stream from 'effect/Stream'

/** The scrollable viewport the page is rendered in: its commands and its events. */
export class Viewport extends Context.Service<
  Viewport,
  {
    /** Event: whether the user is currently scrolling. */
    readonly isScrolling: Stream.Stream<boolean>
    /** Event: the vertical scroll offset, emitted on subscription and on every scroll. */
    readonly scrollY: Stream.Stream<number>
    /** Command: smoothly scrolls back to the top. */
    readonly scrollToTop: Effect.Effect<void>
  }
>()('e68a4759d6d50ba3') {}
