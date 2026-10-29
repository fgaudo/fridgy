import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { BackHandler } from 'react-native'
import { BackButton, observed } from './back-button.ts'

/**
 * Android's back button, through React Native's dispatcher: a press is the app's while the button is held, and
 * otherwise the platform's, which leaves the app.
 */
export const layer = Layer.effect(
  BackButton,
  Effect.gen(function*() {
    // The handler answers React Native synchronously whether the press is the app's.
    let isHeld = false
    const { presses, press } = yield* observed(
      Effect.sync(() => {
        isHeld = true
      }),
      Effect.sync(() => {
        isHeld = false
      }),
    )
    yield* Effect.acquireRelease(
      Effect.sync(() =>
        BackHandler.addEventListener('hardwareBackPress', () => {
          if (isHeld) press()
          return isHeld
        })
      ),
      (subscription) => Effect.sync(() => subscription.remove()),
    )
    return { presses }
  }),
)
