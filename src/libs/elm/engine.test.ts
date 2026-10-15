import { describe, expect, test } from 'bun:test'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import type * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'
import * as Engine from './engine.ts'

// A counter that accepts `Increment` and always rejects `Forbidden`.
type Message = 'Increment' | 'Forbidden'

const make = (initCommands: ReadonlyArray<Engine.Command<Message, never>> = []) =>
  Engine.make<number, Message, never, never, never>({
    init: { state: 0, commands: initCommands },
    update: (message) => (count) => (message === 'Increment' ? { state: count + 1 } : Engine.reject),
    subscriptions: () => HashMap.empty(),
  })

const revision = (engine: Engine.Engine<number, Message>, target: Engine.Revision) =>
  engine.state$.pipe(
    Stream.filter(({ revision }) => revision >= target),
    Stream.runHead,
    Effect.map(Opt.getOrThrow),
  )

/** Runs `engine.await` for a short while: `None` means the engine is still alive. */
const failureWithin = (engine: Engine.Engine<number, Message>) =>
  engine.await.pipe(Effect.exit, Effect.timeoutOption('200 millis'))

const run = <A>(effect: Effect.Effect<A, never, Scope.Scope>) =>
  Effect.runPromise(Effect.scoped(effect))

describe('Engine reject', () => {
  test('a message rejected for the current revision kills the engine with RejectedMessage', async () => {
    const exit = await run(Effect.gen(function*() {
      const engine = yield* make()
      engine.dispatchFrom(0)('Forbidden')
      return yield* failureWithin(engine)
    }))
    expect(Opt.isSome(exit)).toBe(true)
    const result = Opt.getOrThrow(exit)
    expect(Exit.isFailure(result)).toBe(true)
    if (Exit.isFailure(result)) {
      expect(Cause.squash(result.cause)).toBeInstanceOf(Engine.RejectedMessage)
    }
  })

  test('a message rejected for an older revision is ignored', async () => {
    const outcome = await run(Effect.gen(function*() {
      const engine = yield* make()
      const dispatchFromFirstFrame = engine.dispatchFrom(0)
      dispatchFromFirstFrame('Increment') // revision 0 → 1
      yield* revision(engine, 1)
      dispatchFromFirstFrame('Forbidden') // stale: drawn from revision 0
      engine.dispatchFrom(1)('Increment') // revision 1 → 2
      const reached = yield* revision(engine, 2)
      return { reached, failure: yield* failureWithin(engine) }
    }))
    expect(outcome.reached).toEqual({ state: 2, revision: 2 })
    expect(Opt.isNone(outcome.failure)).toBe(true)
  })

  test('a message rejected after coming from a command is ignored', async () => {
    const outcome = await run(Effect.gen(function*() {
      const engine = yield* make([Effect.succeedSome<Message>('Forbidden')])
      engine.dispatchFrom(0)('Increment')
      const reached = yield* revision(engine, 1)
      return { reached, failure: yield* failureWithin(engine) }
    }))
    expect(outcome.reached.state).toBe(1)
    expect(Opt.isNone(outcome.failure)).toBe(true)
  })

  test('a stale message that is still accepted is applied', async () => {
    const reached = await run(Effect.gen(function*() {
      const engine = yield* make()
      const dispatchFromFirstFrame = engine.dispatchFrom(0)
      dispatchFromFirstFrame('Increment')
      dispatchFromFirstFrame('Increment') // drawn from revision 0, still makes sense
      return yield* revision(engine, 2)
    }))
    expect(reached).toEqual({ state: 2, revision: 2 })
  })
})
