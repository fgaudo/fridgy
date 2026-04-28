import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Stream from 'effect/Stream'

export class Viewport extends Context.Service<
  Viewport,
  {
    scrollEnd$: Stream.Stream<{ y: number }>
    activity$: Stream.Stream<boolean>
  }
>()('def56e20eecf8ec0') {}
