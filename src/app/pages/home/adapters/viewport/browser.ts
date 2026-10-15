import { fromEventListenerWindow } from '@effect/platform-browser/BrowserStream'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import { Viewport } from '../../ports/viewport.ts'

export const layer = Layer.succeed(Viewport, {
  isScrolling: Stream.merge(
    fromEventListenerWindow('scroll').pipe(Stream.map(() => true)),
    fromEventListenerWindow('scrollend').pipe(Stream.map(() => false)),
  ).pipe(Stream.changes),

  scrollY: Stream.concat(Stream.make(undefined), fromEventListenerWindow('scroll')).pipe(
    Stream.mapEffect(() => Effect.sync(() => window.scrollY)),
  ),

  scrollToTop: Effect.sync(() => window.scrollTo({ top: 0, behavior: 'smooth' })),
})
