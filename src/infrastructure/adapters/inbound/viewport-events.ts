import { BrowserStream } from '@effect/platform-browser'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import { ViewportEvents } from '@/app/ports/inbound/viewport-events.ts'

export const makeLayer = (
  { scroll$, scrollEnd$, getScrollY }: {
    scrollEnd$: Stream.Stream<Event, never, never>
    scroll$: Stream.Stream<Event, never, never>
    getScrollY: Effect.Effect<number, never, never>
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
      scrollEnd$: scrollEnd$.pipe(
        Stream.mapEffect(Effect.fn(function*() {
          return { y: yield* getScrollY }
        })),
      ),
      isAtTop$: Stream.concat(Stream.make(3), scroll$).pipe(
        Stream.mapEffect(() =>
          Effect.sync(
            () => window.scrollY === 0,
          )
        ),
        Stream.changes,
      ),
      isCloseToTop$: Stream.concat(Stream.make(3), scroll$).pipe(
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
  getScrollY: Effect.sync(() => window.scrollY),
})
