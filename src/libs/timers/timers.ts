import type * as Tea from '@fgaudo/effect-tea'
import * as Channel from 'effect/Channel'
import * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'

/**
 * A clock: it sends the current time, in the `CurrentTimeZone`, at once, then again every `interval`, and never
 * ends. The first tick is immediate because a clock is wanted for the time now, not one interval from now.
 */
export const every = <Message>(
  interval: Duration.Input,
  toMessage: (now: DateTime.Zoned) => Message,
): Tea.Subscription<Message, DateTime.CurrentTimeZone> =>
  Channel.forever(
    Channel.fromEffect(DateTime.nowInCurrentZone).pipe(
      Channel.map(toMessage),
      Channel.concatWith(() => Channel.fromEffectDrain(Effect.sleep(interval))),
    ),
  )

/** Ends with `message` once `duration` has passed, and sends nothing before. */
export const after = <Message>(duration: Duration.Input, message: Message): Tea.Subscription<Message, never> =>
  Channel.fromEffectDone(Effect.as(Effect.sleep(duration), message))
