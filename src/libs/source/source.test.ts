import { describe, expect, test } from 'bun:test'
import * as Channel from 'effect/Channel'
import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as Stream from 'effect/Stream'
import * as Source from './source.ts'

/** Runs `source` for a short while: what it sent, and how it ended (`None`: still running). */
const listen = async <A>(source: Source.Source<A, never>) => {
  const values: Array<A> = []
  const exit = await Effect.runPromise(
    Channel.runForEach(source, (value) => Effect.sync(() => values.push(value))).pipe(
      Effect.exit,
      Effect.timeoutOption('100 millis'),
    ),
  )
  return { values, exit }
}

describe('fromStream', () => {
  test('sends every value of the stream, one at a time', async () => {
    const { values } = await listen(Source.fromStream(Stream.concat(Stream.make('a', 'b'), Stream.never)))
    expect(values).toEqual(['a', 'b'])
  })

  test('keeps listening once the stream has ended', async () => {
    const { values, exit } = await listen(Source.fromStream(Stream.make('a')))
    expect(values).toEqual(['a'])
    expect(Opt.isNone(exit)).toBe(true)
  })

  test('keeps the end in its type through a transformation', async () => {
    const lengths: Source.Source<number, never> = Channel.map(
      Source.fromStream(Stream.make('ab', 'c')),
      (s) => s.length,
    )
    expect((await listen(lengths)).values).toEqual([2, 1])
  })
})
