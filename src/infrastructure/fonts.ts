import * as Effect from 'effect/Effect'
import * as AnimationFrame from './animation-frame.ts'

// Waits for the fonts the displayed document uses, then for one more frame: with
// `font-display: swap` the text is first painted with a fallback font, and
// repainted only once the real one has loaded.
export const loaded = Effect.promise(() => document.fonts.ready).pipe(
  Effect.andThen(AnimationFrame.next),
)
