import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'

export class ViewportEvents extends Context.Service<
  ViewportEvents,
  {
    isAtTop$: Stream.Stream<boolean>
    isCloseToTop$: Stream.Stream<boolean>
    activity$: Stream.Stream<boolean>
  }
>()('65ba5a6e21ac2521') {}
