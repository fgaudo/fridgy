import { describe, expect, test } from 'bun:test'
import * as Channel from 'effect/Channel'
import * as Effect from 'effect/Effect'
import * as Fiber from 'effect/Fiber'
import * as Ref from 'effect/Ref'
import type * as Source from '#libs/source/source.ts'
import { observed } from './back-button.ts'

// The hold and the release run under a semaphore, after the observer has started: a short wait lets them.
const settle = Effect.sleep('20 millis')

/** Observes `presses`, counting what it hears, until the fiber is interrupted. */
const observe = Effect.fnUntraced(function*(presses: Source.Source<void, never>) {
  const heard = yield* Ref.make(0)
  const fiber = yield* Effect.forkChild(Channel.runForEach(presses, () => Ref.update(heard, (n) => n + 1)))
  yield* settle
  return { heard: Ref.get(heard), stop: Fiber.interrupt(fiber).pipe(Effect.andThen(settle)) }
})

describe('observed', () => {
  test('holds the button from the first observer to the last, once each', () =>
    Effect.runPromise(Effect.gen(function*() {
      const holds = yield* Ref.make(0)
      const releases = yield* Ref.make(0)
      const { presses } = yield* observed(Ref.update(holds, (n) => n + 1), Ref.update(releases, (n) => n + 1))
      const first = yield* observe(presses)
      const second = yield* observe(presses)
      expect(yield* Ref.get(holds)).toBe(1)
      yield* first.stop
      expect(yield* Ref.get(releases)).toBe(0)
      yield* second.stop
      expect(yield* Ref.get(holds)).toBe(1)
      expect(yield* Ref.get(releases)).toBe(1)
    })))

  test('a press goes to the last observer only, and to the previous one once it stops', () =>
    Effect.runPromise(Effect.gen(function*() {
      const { presses, press } = yield* observed(Effect.void, Effect.void)
      const first = yield* observe(presses)
      const second = yield* observe(presses)
      press()
      yield* settle
      expect(yield* first.heard).toBe(0)
      expect(yield* second.heard).toBe(1)
      yield* second.stop
      press()
      yield* settle
      expect(yield* first.heard).toBe(1)
      yield* first.stop
    })))

  test('a press with no observer goes nowhere', () =>
    Effect.runPromise(Effect.gen(function*() {
      const { presses, press } = yield* observed(Effect.void, Effect.void)
      press()
      const observer = yield* observe(presses)
      expect(yield* observer.heard).toBe(0)
      yield* observer.stop
    })))
})
