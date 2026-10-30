import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import { KeyboardController, KeyboardEvents } from 'react-native-keyboard-controller'
import * as Source from '#libs/source/source.ts'
import { Keyboard } from './keyboard.ts'

/**
 * `react-native-keyboard-controller`, which listens to the window's insets. React Native's own keyboard events
 * are derived from the root view's layout passes instead: a new root view, as an activity recreated gives, knows
 * nothing of a keyboard that was up, and the inset would stay as it was.
 */
export const layer = Layer.succeed(Keyboard, {
  insets: Source.fromStream(
    Stream.callback<number>((queue) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          // The keyboard may be up already when a page starts observing: its height is told at once.
          Queue.offerUnsafe(queue, KeyboardController.isVisible() ? KeyboardController.state().height : 0)
          return [
            KeyboardEvents.addListener('keyboardDidShow', ({ height }) => {
              Queue.offerUnsafe(queue, height)
            }),
            KeyboardEvents.addListener('keyboardDidHide', () => {
              Queue.offerUnsafe(queue, 0)
            }),
          ]
        }),
        (listeners) =>
          Effect.sync(() => {
            for (const listener of listeners) listener.remove()
          }),
      )
    ).pipe(Stream.changes),
  ),
})
