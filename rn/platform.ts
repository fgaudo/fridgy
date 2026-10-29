// The platform's adapters on React Native, for the prototype.
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Match from 'effect/Match'
import * as Stream from 'effect/Stream'
import { BackHandler, Vibration } from 'react-native'
import { Scanner, ScannerError } from '#app/children/add-products/services/scanner/scanner.ts'
import { Position, Viewport } from '#app/children/home/services/viewport/viewport.ts'
import { BackButton, observed } from '#infrastructure/back-button/back-button.ts'
import { type Feedback, Haptics } from '#infrastructure/haptics/haptics.ts'
import * as Source from '#libs/source/source.ts'

/** Android's back dispatcher: a press is the app's while it is held, or else the platform's, which leaves. */
export const backButton = Layer.effect(
  BackButton,
  Effect.gen(function*() {
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

// Patterns in milliseconds; `docs/haptics.md` maps them to Android's constants, which React Native does not expose.
const patternOf = Match.type<Feedback>().pipe(
  Match.when('LongPress', () => [0, 40]),
  Match.when('Confirm', () => [0, 20]),
  Match.when('Reject', () => [0, 30, 60, 30]),
  Match.exhaustive,
)

export const haptics = Layer.succeed(Haptics, {
  perform: (feedback) => Effect.sync(() => Vibration.vibrate(patternOf(feedback))),
})

/** The camera is not in the prototype: AddProducts offers no scan. */
export const scanner = Layer.succeed(Scanner, {
  isAvailable: Effect.succeed(false),
  barcodes: Source.fromStream(Stream.fail(new ScannerError({ cause: 'No camera in the prototype' }))),
})

/** Home's scrolling is not drawn by the prototype: the bar stays expanded. */
export const viewport = Layer.succeed(Viewport, {
  isScrolling: Source.fromStream(Stream.concat(Stream.make(false), Stream.never)),
  position: Source.fromStream(Stream.concat(Stream.make(Position.Expanded()), Stream.never)),
  expandBar: Effect.void,
  collapseBar: Effect.void,
})
