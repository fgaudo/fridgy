import { describe, expect, test } from 'bun:test'
import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as Stream from 'effect/Stream'
import * as Listener from './listener.ts'

/** Runs `listener` for a short while: what it sent, and how it ended (`None`: still running). */
const listen = async <A>(listener: Listener.Listener<A>) => {
  const values: Array<A> = []
  const exit = await Effect.runPromise(
    listener((value) => Effect.sync(() => values.push(value))).pipe(Effect.exit, Effect.timeoutOption('100 millis')),
  )
  return { values, exit }
}

describe('fromStream', () => {
  test('sends every value of the stream', async () => {
    const { values } = await listen(Listener.fromStream(Stream.concat(Stream.make('a', 'b'), Stream.never)))
    expect(values).toEqual(['a', 'b'])
  })

  test('keeps listening once the stream has ended', async () => {
    const { values, exit } = await listen(Listener.fromStream(Stream.make('a')))
    expect(values).toEqual(['a'])
    expect(Opt.isNone(exit)).toBe(true)
  })
})
