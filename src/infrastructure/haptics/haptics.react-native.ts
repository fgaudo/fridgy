import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Match from 'effect/Match'
import { Vibration } from 'react-native'
import { type Feedback, Haptics, HapticsError } from './haptics.ts'

// React Native has no haptic feedback constants: these patterns, in milliseconds, stand for the three of
// `docs/haptics.md` until a native module plays Android's own.
const patternOf = Match.type<Feedback>().pipe(
  Match.when('LongPress', () => [0, 40]),
  Match.when('Confirm', () => [0, 20]),
  Match.when('Reject', () => [0, 30, 60, 30]),
  Match.exhaustive,
)

/** Android's vibrator. The platform may refuse it (a permission, a policy): a failure the programs handle. */
export const layer = Layer.succeed(Haptics, {
  perform: (feedback) =>
    Effect.try({
      try: () => Vibration.vibrate(patternOf(feedback)),
      catch: (cause) => new HapticsError({ cause }),
    }),
})
