import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'

export class ViewportEvents extends Context.Service<
  ViewportEvents,
  {
    isAtTop$: Stream.Stream<boolean>
    isCloseToTop$: Stream.Stream<boolean>
    activity$: Stream.Stream<boolean>
  }
>()('a2a56e7abe76bd4d') {}
