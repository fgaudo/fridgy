import { fromEventListenerWindow } from '@effect/platform-browser/BrowserStream'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'
import { Message } from '@/feature/home/application/messages.ts'

const scroll$ = fromEventListenerWindow('scroll')
const scrollEnd$ = fromEventListenerWindow('scrollend')

export const scroll = Stream.mergeAll<Message, never, never>([
  Stream.merge(
    scroll$.pipe(Stream.map(() => true)),
    scrollEnd$.pipe(Stream.map(() => false)),
  ).pipe(
    Stream.changes,
    Stream.map((isInteracting) => Message.InteractionChanged({ isInteracting })),
  ),
  Stream.concat(Stream.make(undefined), scroll$).pipe(
    Stream.mapEffect(() =>
      Effect.sync(
        () => Message.ViewportAtTopChanged({ isAtTop: window.scrollY === 0 }),
      )
    ),
    Stream.changes,
  ),
  Stream.concat(Stream.make(undefined), scroll$).pipe(
    Stream.mapEffect(() =>
      Effect.sync(
        () => Message.ViewportCloseToTopChanged({ isCloseToTop: window.scrollY <= 30 }),
      )
    ),
    Stream.changes,
  ),
], { concurrency: 'unbounded' })
