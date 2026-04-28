import { BrowserStream } from '@effect/platform-browser'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import { Viewport } from '@/app/ports/inbound/viewport.ts'

const scrollEnd$ = BrowserStream.fromEventListenerWindow('scrollend')

export const layer = Layer.succeed(
  Viewport,
  {
    activity$: Stream.merge(
      BrowserStream.fromEventListenerWindow('scroll').pipe(Stream.map(() => true)),
      scrollEnd$.pipe(Stream.map(() => false)),
    ).pipe(
      Stream.changes,
    ),
    scrollEnd$: scrollEnd$.pipe(
      Stream.mapEffect(Effect.fn(function*() {
        return { y: yield* Effect.sync(() => window.scrollY) }
      })),
    ),
  },
)
