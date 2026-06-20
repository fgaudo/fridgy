import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'

export class ViewportEvents extends Context.Service<
  ViewportEvents,
  {
    isInteracting$: Stream.Stream<
      boolean
    >
    isAtTop$: Stream.Stream<
      boolean
    >
    isCloseToTop$: Stream.Stream<
      boolean
    >
  }
>()('27367344ad7cc506') {}
