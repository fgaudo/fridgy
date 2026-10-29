import { fromEventListenerWindow } from '@effect/platform-browser/BrowserStream'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as Source from '#libs/source/source.ts'
import { Position, Viewport } from './viewport.ts'

// `--bar-collapse` of `styles.css`, in pixels: a registered length computes to them. A page that scrolls less ends
// the collapse sooner.
const collapse = () =>
  Math.min(
    Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-collapse')),
    document.documentElement.scrollHeight - window.innerHeight,
  )

// A scroll to a fractional length lands on a device pixel, up to a pixel short of it.
const positionOf = (y: number, collapse: number) =>
  y <= 0
    ? Position.Expanded()
    : y >= collapse - 1
    ? Position.Collapsed()
    : y < collapse / 2
    ? Position.CloserToExpanded()
    : Position.CloserToCollapsed()

export const layer = Layer.succeed(Viewport, {
  isScrolling: Source.fromStream(
    Stream.merge(
      fromEventListenerWindow('scroll').pipe(Stream.map(() => true)),
      fromEventListenerWindow('scrollend').pipe(Stream.map(() => false)),
    ).pipe(Stream.changes),
  ),

  position: Source.fromStream(
    Stream.concat(Stream.make(undefined), fromEventListenerWindow('scroll')).pipe(
      Stream.mapEffect(() => Effect.sync(() => positionOf(window.scrollY, collapse()))),
      Stream.changesWith((a, b) => a._tag === b._tag),
    ),
  ),

  expandBar: Effect.sync(() => window.scrollTo({ top: 0, behavior: 'smooth' })),

  collapseBar: Effect.sync(() => window.scrollTo({ top: collapse(), behavior: 'smooth' })),
})
