import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as Socket from 'effect/socket/Socket'
import { CssRefresher } from '@/infra/css-refresher.ts'
import { saferImport } from '@/libs/dynamic-import/safer-import.ts'

export const watch = Effect.fn('HotModule.watch')(function*(path: string) {
  const refreshCss = yield* CssRefresher
  const socket = yield* Socket.Socket
  const load = Effect.gen(function*() {
    yield* refreshCss
    const millis = yield* Clock.currentTimeMillis
    return yield* saferImport(`${path}?t=${millis}`)
  })
  const moduleRef = yield* SubscriptionRef.make(yield* load)
  yield* Socket.toStream(socket).pipe(
    Stream.runForEach(() => SubscriptionRef.updateEffect(moduleRef, () => load)),
    // The dev server may restart: keep reconnecting.
    Effect.retry({ schedule: Schedule.spaced('1 second') }),
    Effect.forkScoped,
  )
  return SubscriptionRef.changes(moduleRef) satisfies Stream.Stream<unknown>
})
