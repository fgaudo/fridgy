import { describe, expect, test } from 'bun:test'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as References from 'effect/References'
import type * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'
import * as Engine from './engine.ts'

// A counter that accepts `Increment`, `Decrement` only above zero, and never `Forbidden`.
type Message = 'Increment' | 'Decrement' | 'Forbidden'

const make = (initCommands: ReadonlyArray<Engine.Command<Message, never>> = []) =>
  Engine.make<number, Message, never, never, never>({
    init: { state: 0, commands: initCommands },
    update: (message) => (count) =>
      message === 'Increment'
        ? { state: count + 1 }
        : message === 'Decrement' && count > 0
        ? { state: count - 1 }
        : Engine.reject,
    subscriptions: () => HashMap.empty(),
    onRejected: 'die',
  })

const first: Engine.Revisioned<number> = { state: 0, revision: 0 }

const revision = (engine: Engine.Engine<number, Message>, target: Engine.Revision) =>
  engine.state$.pipe(
    Stream.filter(({ revision }) => revision >= target),
    Stream.runHead,
    Effect.map(Opt.getOrThrow),
  )

/** Runs `engine.await` for a short while: `None` means the engine is still alive. */
const failureWithin = (engine: Engine.Engine<number, Message>) =>
  engine.await.pipe(Effect.exit, Effect.timeoutOption('200 millis'))

const diedWithRejectedMessage = (exit: Opt.Option<Exit.Exit<never>>) =>
  Opt.isSome(exit) && Exit.isFailure(exit.value) && Cause.squash(exit.value.cause) instanceof Engine.RejectedMessage

// Some tests make the engine die on purpose: what it logs then is expected.
const run = <A>(effect: Effect.Effect<A, never, Scope.Scope>) =>
  Effect.runPromise(Effect.scoped(effect).pipe(Effect.provideService(References.MinimumLogLevel, 'None')))

describe('Engine reject', () => {
  test('a message the current frame sent and update rejects kills the engine with RejectedMessage', async () => {
    const exit = await run(Effect.gen(function*() {
      const engine = yield* make()
      engine.dispatchFrom(first)('Forbidden')
      return yield* failureWithin(engine)
    }))
    expect(diedWithRejectedMessage(exit)).toBe(true)
  })

  test('so does one an older frame sent, if its own state rejects it too', async () => {
    const exit = await run(Effect.gen(function*() {
      const engine = yield* make()
      const dispatchFromFirstFrame = engine.dispatchFrom(first)
      dispatchFromFirstFrame('Increment') // revision 0 → 1
      yield* revision(engine, 1)
      // The first frame never had a reason to offer it: a bug, even though the state moved on since.
      dispatchFromFirstFrame('Forbidden')
      return yield* failureWithin(engine)
    }))
    expect(diedWithRejectedMessage(exit)).toBe(true)
  })

  test('a message an older frame offered rightly, and that no longer applies, is ignored', async () => {
    const outcome = await run(Effect.gen(function*() {
      const engine = yield* make()
      engine.dispatchFrom(first)('Increment') // revision 0 → 1
      const atOne = yield* revision(engine, 1)
      const dispatchFromSecondFrame = engine.dispatchFrom(atOne)
      dispatchFromSecondFrame('Decrement') // revision 1 → 2, back to 0
      dispatchFromSecondFrame('Decrement') // a double tap: fine at 1, stale at 0
      engine.dispatchFrom(atOne)('Increment') // revision 2 → 3
      const reached = yield* revision(engine, 3)
      return { reached, failure: yield* failureWithin(engine) }
    }))
    expect(outcome.reached).toEqual({ state: 1, revision: 3 })
    expect(Opt.isNone(outcome.failure)).toBe(true)
  })

  test('a message rejected after coming from a command is ignored', async () => {
    const outcome = await run(Effect.gen(function*() {
      const engine = yield* make([Effect.succeedSome<Message>('Forbidden')])
      engine.dispatchFrom(first)('Increment')
      const reached = yield* revision(engine, 1)
      return { reached, failure: yield* failureWithin(engine) }
    }))
    expect(outcome.reached.state).toBe(1)
    expect(Opt.isNone(outcome.failure)).toBe(true)
  })

  test('a stale message that is still accepted is applied', async () => {
    const reached = await run(Effect.gen(function*() {
      const engine = yield* make()
      const dispatchFromFirstFrame = engine.dispatchFrom(first)
      dispatchFromFirstFrame('Increment')
      dispatchFromFirstFrame('Increment') // drawn from revision 0, still makes sense
      return yield* revision(engine, 2)
    }))
    expect(reached).toEqual({ state: 2, revision: 2 })
  })
})
