import { Haptics as CapacitorHaptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Match from 'effect/Match'
import { type Feedback, Haptics, HapticsError } from './haptics.ts'

// The plugin plays its own waveforms on Android, not the system's constants: the heavy impact stands for
// `LONG_PRESS`, the medium one for `CONFIRM`, and the error's two pulses for `REJECT`.
const play = Match.type<Feedback>().pipe(
  Match.when('LongPress', () => CapacitorHaptics.impact({ style: ImpactStyle.Heavy })),
  Match.when('Confirm', () => CapacitorHaptics.impact({ style: ImpactStyle.Medium })),
  Match.when('Reject', () => CapacitorHaptics.notification({ type: NotificationType.Error })),
  Match.exhaustive,
)

/** Android's vibrator; in the browser, Capacitor falls back to `navigator.vibrate`. */
export const layer = Layer.succeed(Haptics, {
  perform: (feedback) =>
    Effect.tryPromise({
      try: () => play(feedback),
      catch: (cause) => new HapticsError({ cause }),
    }),
})
