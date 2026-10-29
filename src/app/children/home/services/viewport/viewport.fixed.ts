import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as Source from '#libs/source/source.ts'
import { Position, Viewport } from './viewport.ts'

/**
 * A viewport that never scrolls: the bar stays expanded and the FAB keeps its label. It stands in until the list's
 * scrolling reaches the program.
 */
export const layer = Layer.succeed(Viewport, {
  isScrolling: Source.fromStream(Stream.concat(Stream.make(false), Stream.never)),
  position: Source.fromStream(Stream.concat(Stream.make(Position.Expanded()), Stream.never)),
  expandBar: Effect.void,
  collapseBar: Effect.void,
})
