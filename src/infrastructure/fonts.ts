import * as Effect from 'effect/Effect'
import * as AnimationFrame from '#libs/animation-frame/animation-frame.ts'

/**
 * Loads every font face the stylesheets declare, then waits one more frame. A face otherwise loads only when
 * some text first needs it: the split CJK fonts would swap in while the app is in use, a flash of style.
 * Waiting for `document.fonts.ready` is not enough: it only covers the faces already requested.
 */
export const loaded = Effect.tryPromise(() => Promise.all(Array.from(document.fonts, (face) => face.load()))).pipe(
  // A face that fails to load keeps its fallback font: the app still starts.
  Effect.catch((cause) => Effect.logWarning('A font face could not be loaded', cause)),
  Effect.andThen(AnimationFrame.next),
)
