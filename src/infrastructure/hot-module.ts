import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as Socket from 'effect/socket/Socket'
import { CssRefresher } from '#infrastructure/css-refresher.ts'
import { saferImport } from '#libs/dynamic-import/safer-import.ts'

export const watch = Effect.fn('HotModule.watch')(function*(path: string) {
  const refreshCss = yield* CssRefresher
  const socket = yield* Socket.Socket
  const load = Effect.gen(function*() {
    const millis = yield* Clock.currentTimeMillis
    return yield* saferImport(`${path}?t=${millis}`)
  })
  // The page already loaded the stylesheet: it is refreshed only when a view is swapped, before the new view
  // renders, so that its new classes are never unstyled.
  const reload = refreshCss.pipe(
    Effect.catchTag('CssLoadError', ({ href }) => Effect.logWarning(`Could not reload the stylesheet ${href}`)),
    Effect.andThen(load),
  )
  const moduleRef = yield* SubscriptionRef.make(yield* load)
  yield* Socket.toStream(socket).pipe(
    Stream.map((frame) => new TextDecoder().decode(frame)),
    // The dev server says whether only the view changed, or something it
    // cannot swap in place.
    Stream.runForEach((signal) =>
      signal === 'reload-page'
        ? Effect.logInfo('Hot reload: reloading the page').pipe(Effect.andThen(Effect.sync(() => location.reload())))
        : Effect.logInfo('Hot reload: swapping the view and the styles').pipe(
          Effect.andThen(SubscriptionRef.updateEffect(moduleRef, () => reload)),
        )
    ),
    // The dev server may restart: keep reconnecting.
    Effect.retry({ schedule: Schedule.spaced('1 second') }),
    Effect.forkScoped,
  )
  return SubscriptionRef.changes(moduleRef) satisfies Stream.Stream<unknown>
})
