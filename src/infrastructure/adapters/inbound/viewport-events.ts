import { BrowserStream } from '@effect/platform-browser'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import { ViewportEvents } from '@/app/ports/inbound/viewport-events.ts'

export const makeLayer = (
  { scroll$, scrollEnd$ }: {
    scrollEnd$: Stream.Stream<Event, never, never>
    scroll$: Stream.Stream<Event, never, never>
  },
) =>
  Layer.succeed(
    ViewportEvents,
    {
      activity$: Stream.merge(
        scroll$.pipe(Stream.map(() => true)),
        scrollEnd$.pipe(Stream.map(() => false)),
      ).pipe(
        Stream.changes,
      ),
      isAtTop$: Stream.concat(Stream.make(undefined), scroll$).pipe(
        Stream.mapEffect(() =>
          Effect.sync(
            () => window.scrollY === 0,
          )
        ),
        Stream.changes,
      ),
      isCloseToTop$: Stream.concat(Stream.make(undefined), scroll$).pipe(
        Stream.mapEffect(() =>
          Effect.sync(
            () => window.scrollY <= 30,
          )
        ),
        Stream.changes,
      ),
    },
  )

export const layer = makeLayer({
  scroll$: BrowserStream.fromEventListenerWindow('scroll'),
  scrollEnd$: BrowserStream.fromEventListenerWindow('scrollend'),
})
