import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'
import type { Source } from '#libs/source/source.ts'

/** Where the page lies along the scroll that collapses the medium top app bar into the small one. */
export type Position = Data.TaggedEnum<{
  Expanded: object
  CloserToExpanded: object
  CloserToCollapsed: object
  Collapsed: object
}>

export const Position = Data.taggedEnum<Position>()

export class Viewport extends Context.Service<
  Viewport,
  {
    readonly isScrolling: Source<boolean, never>
    /** Event: the page's position, emitted on subscription and when it changes. */
    readonly position: Source<Position, never>
    /** Scrolls to the top, where the bar is expanded. */
    readonly expandBar: Effect.Effect<void>
    /** Scrolls to where the bar has just collapsed, or as far as the page goes. */
    readonly collapseBar: Effect.Effect<void>
  }
>()('aa5847dededeb912') {}
