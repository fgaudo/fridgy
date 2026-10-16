import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type { Listener } from '@/libs/listener/listener.ts'

export class Viewport extends Context.Service<
  Viewport,
  {
    readonly isScrolling: Listener<boolean>
    /** Event: whether the page is within `offset` pixels of the top, emitted on subscription and when it changes. */
    readonly isNearTop: (offset: number) => Listener<boolean>
    readonly scrollToTop: Effect.Effect<void>
  }
>()('e68a4759d6d50ba3') {}
