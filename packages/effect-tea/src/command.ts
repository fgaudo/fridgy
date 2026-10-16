import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as Stream from 'effect/Stream'
import type { Command } from './engine.ts'

/**
 * Turns an effect that may fail into a command: its success and its expected failure both become messages,
 * so `update` decides what each means. Defects still crash the program.
 */
export const attempt = <A, E, R, Message>(
  effect: Effect.Effect<A, E, R>,
  handlers: Readonly<{ onSuccess: (value: A) => Message; onFailure: (error: E) => Message }>,
): Command<Message, R> =>
  Effect.match(effect, {
    onSuccess: (value) => Opt.some(handlers.onSuccess(value)),
    onFailure: (error) => Opt.some(handlers.onFailure(error)),
  })

/**
 * The same for a subscription: each value becomes a message, and an expected failure ends the stream with
 * one last message. The subscription starts again only if its key leaves the subscriptions and comes back.
 */
export const attemptStream = <A, E, R, Message>(
  stream: Stream.Stream<A, E, R>,
  handlers: Readonly<{ onValue: (value: A) => Message; onFailure: (error: E) => Message }>,
): Stream.Stream<Message, never, R> =>
  stream.pipe(
    Stream.map(handlers.onValue),
    Stream.catch((error) => Stream.make(handlers.onFailure(error))),
  )
