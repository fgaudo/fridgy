import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Queue from 'effect/Queue'
import * as Semaphore from 'effect/Semaphore'
import * as Stream from 'effect/Stream'
import * as Source from '#libs/source/source.ts'

export class BackButtonError extends Data.TaggedError('BackButtonError')<{
  readonly cause: unknown
}> {}

/**
 * The platform's back button (Android's, the browser's), which the pages observe directly: a press has no
 * shape for a page to give it. The button is the app's only while it is observed: otherwise the platform acts
 * on it, and leaves the app. A press goes to the last observer only: what opened last is on top, and closes
 * first, as Android's own back dispatcher does with its callbacks.
 */
export class BackButton extends Context.Service<
  BackButton,
  {
    readonly presses: Source.Source<void, never>
  }
>()('cac2da1be5d6599d') {}

/**
 * `presses`, heard by the last observer, and `press`, for the platform's listener. The button is held from the
 * first observer to the last, one change at a time: when the shown page changes, the old page stops observing
 * as the new one starts, and their hold and release would otherwise run over each other.
 */
export const observed = Effect.fnUntraced(function*(hold: Effect.Effect<void>, release: Effect.Effect<void>) {
  const hearers = new Set<() => void>()
  const oneAtATime = (yield* Semaphore.make(1)).withPermits(1)
  const presses: Source.Source<void, never> = Source.fromStream(Stream.callback<void>((queue) => {
    const hear = () => Queue.offerUnsafe(queue, undefined)
    return Effect.acquireRelease(
      oneAtATime(Effect.suspend(() => {
        hearers.add(hear)
        return hearers.size === 1 ? hold : Effect.void
      })),
      () =>
        oneAtATime(Effect.suspend(() => {
          hearers.delete(hear)
          return hearers.size === 0 ? release : Effect.void
        })),
    )
  }))
  // A `Set` keeps the order of insertion: the last one is the observer that came last.
  const press = () => {
    Array.from(hearers).at(-1)?.()
  }
  return { presses, press }
})
