import { fromEventListenerWindow } from '@effect/platform-browser/BrowserStream'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Listener from '@/libs/listener/listener.ts'
import * as Stream from 'effect/Stream'
import { Viewport } from '../../ports/viewport.ts'

const scrollY = Stream.concat(Stream.make(undefined), fromEventListenerWindow('scroll')).pipe(
  Stream.mapEffect(() => Effect.sync(() => window.scrollY)),
)

export const layer = Layer.succeed(Viewport, {
  isScrolling: Listener.fromStream(
    Stream.merge(
      fromEventListenerWindow('scroll').pipe(Stream.map(() => true)),
      fromEventListenerWindow('scrollend').pipe(Stream.map(() => false)),
    ).pipe(Stream.changes),
  ),

  isNearTop: (offset) => Listener.fromStream(scrollY.pipe(Stream.map((y) => y <= offset), Stream.changes)),

  scrollToTop: Effect.sync(() => window.scrollTo({ top: 0, behavior: 'smooth' })),
})
