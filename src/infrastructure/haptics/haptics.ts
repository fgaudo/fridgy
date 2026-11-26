import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'

export class HapticsError extends Data.TaggedError('HapticsError')<{
  readonly cause: unknown
}> {}

/**
 * What a vibration tells, named after Android's haptic feedback constants: a long press that took effect, an
 * action the user asked for that succeeded, or one that failed.
 */
export type Feedback = 'LongPress' | 'Confirm' | 'Reject'

/** The platform's vibrations, which the programs use directly: a feedback means the same to every one of them. */
export class Haptics extends Context.Service<
  Haptics,
  {
    readonly perform: (feedback: Feedback) => Effect.Effect<void, HapticsError>
  }
>()('1075bef3febac557') {}

/** A program's command to vibrate. A vibration refused is logged: it answers nothing. */
export const vibrate = Effect.fn('Vibrate')(
  function*({ feedback }: Readonly<{ feedback: Feedback }>) {
    const { perform } = yield* Haptics
    yield* perform(feedback).pipe(
      Effect.catchTag('HapticsError', (error) => Effect.logWarning('Could not vibrate', error.cause)),
    )
    return Opt.none()
  },
  Effect.withLogSpan('Vibrate'),
)
