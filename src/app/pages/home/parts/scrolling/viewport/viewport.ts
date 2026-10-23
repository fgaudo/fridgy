import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type { Source } from '#libs/source/source.ts'

export class Viewport extends Context.Service<
  Viewport,
  {
    readonly isScrolling: Source<boolean, never>
    /** Event: whether the page is within `offset` pixels of the top, emitted on subscription and when it changes. */
    readonly isNearTop: (offset: number) => Source<boolean, never>
    readonly scrollToTop: Effect.Effect<void>
  }
>()('92f2d013eabeffb4') {}
