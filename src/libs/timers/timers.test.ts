import { describe, expect, test } from 'bun:test'
import * as Channel from 'effect/Channel'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as TestClock from 'effect/testing/TestClock'
import * as Timers from './timers.ts'

/** Runs `subscription` in the background: what it has sent so far, and what it ended with (`None`: still running). */
const listen = Effect.fnUntraced(
  function*<A, R>(subscription: Channel.Channel<A, never, A, unknown, unknown, unknown, R>) {
    const heard: { sent: Array<A>; ended: Opt.Option<A> } = { sent: [], ended: Opt.none() }
    yield* Effect.forkChild(
      Channel.runForEach(subscription, (value) => Effect.sync(() => heard.sent.push(value))).pipe(
        Effect.tap((done) => Effect.sync(() => (heard.ended = Opt.some(done)))),
      ),
    )
    yield* Effect.yieldNow
    return heard
  },
)

const tokyo = DateTime.zoneMakeNamedUnsafe('Asia/Tokyo')

const run = <A>(effect: Effect.Effect<A, never, DateTime.CurrentTimeZone>) =>
  Effect.runPromise(
    Effect.provide(effect, TestClock.layer()).pipe(Effect.provideService(DateTime.CurrentTimeZone, tokyo)),
  )

describe('every', () => {
  test('sends the time in the current zone at once, then at each interval, and does not end', () =>
    run(Effect.gen(function*() {
      const start = DateTime.setZone(yield* DateTime.now, tokyo)
      const heard = yield* listen(Timers.every('30 seconds', (now) => now))
      expect(heard.sent).toEqual([start])
      yield* TestClock.adjust('29 seconds')
      expect(heard.sent).toEqual([start])
      yield* TestClock.adjust('1 second')
      yield* TestClock.adjust('30 seconds')
      expect(heard.sent).toEqual([start, DateTime.add(start, { seconds: 30 }), DateTime.add(start, { seconds: 60 })])
      expect(Opt.isNone(heard.ended)).toBe(true)
    })))
})

describe('after', () => {
  test('sends nothing before the duration, and ends with its message exactly when it has passed', () =>
    run(Effect.gen(function*() {
      const heard = yield* listen(Timers.after('500 millis', 'done'))
      yield* TestClock.adjust('499 millis')
      expect(Opt.isNone(heard.ended)).toBe(true)
      yield* TestClock.adjust('1 millis')
      expect(heard.sent).toEqual([])
      expect(heard.ended).toEqual(Opt.some('done'))
    })))
})
