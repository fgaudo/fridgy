import * as Effect from 'effect/Effect'

/** Waits for the next animation frame, i.e. right before the browser paints. */
export const next = Effect.callback<void>((resume) => {
  const id = requestAnimationFrame(() => resume(Effect.void))
  return Effect.sync(() => cancelAnimationFrame(id))
})
