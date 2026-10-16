import { describe, expect, test } from 'bun:test'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Opt from 'effect/Option'
import * as Stream from 'effect/Stream'
import { toSubscription } from './endless-stream.ts'

/** Runs the subscription of `stream` for a short while: what it sent, and how it ended (`None`: still running). */
const listen = async (stream: Stream.Stream<string>) => {
  const messages: Array<string> = []
  const exit = await Effect.runPromise(
    toSubscription(stream)((message) => Effect.sync(() => messages.push(message))).pipe(
      Effect.exit,
      Effect.timeoutOption('100 millis'),
    ),
  )
  return { messages, exit }
}

describe('toSubscription', () => {
  test('each value becomes a message, and the subscription keeps running while the stream does', async () => {
    const { messages, exit } = await listen(Stream.concat(Stream.make('a', 'b'), Stream.never))
    expect(messages).toEqual(['a', 'b'])
    expect(Opt.isNone(exit)).toBe(true)
  })

  test('a stream that ends breaks its promise, and dies', async () => {
    const { messages, exit } = await listen(Stream.make('a'))
    expect(messages).toEqual(['a'])
    expect(Opt.exists(exit, Exit.hasDies)).toBe(true)
  })
})
