import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'
import * as Engine from './engine.ts'
import type { Program } from './program.ts'
import type { Dispatch } from './view.ts'

/** What a renderer draws: a model, and the dispatch bound to the state it was made from. */
export type Frame<Model, Message> = Readonly<{ model: Model; dispatch: Dispatch<Message> }>

/**
 * Runs `program` and hands its frames to `render`, the renderer's own loop. Each frame's dispatch is bound to
 * the revision of its state, so a message rejected because it came from an outdated frame is ignored, and
 * one rejected from the current frame is a bug. Ends when `render` ends, and fails with the first defect of
 * the program (or `RejectedMessage`), so whoever runs it can let the app crash.
 */
export const run = <State, Model, Message, R, RR, K>(
  program: Program<State, Model, Message, R, never, K>,
  render: (frames: Stream.Stream<Frame<Model, Message>>) => Effect.Effect<void, never, RR>,
  options: Readonly<{
    /** How a message appears in the logs; by default its `_tag`, never its data. */
    describeMessage?: (message: Message) => unknown
    /**
     * What a message the current frame sent and `update` rejected does (a bug: the model offered it). By
     * default (`'die'`) the run fails with `RejectedMessage`; `'ignore'` drops it and goes on.
     */
    onRejected?: Engine.RejectionPolicy
    /**
     * Reports every bug, e.g. to a crash-reporting service: a `Defect` (always fatal), or a `Rejected` message
     * (fatal unless `onRejected` is `'ignore'`, so that bugs the user never sees still reach you).
     */
    onBug?: (bug: Engine.Bug<Message, K>) => Effect.Effect<void>
  }> = {},
): Effect.Effect<void, never, R | RR> =>
  Effect.gen(function*() {
    const engine = yield* Engine.make({ ...program, ...options })
    const frames = Stream.map(engine.state$, ({ state, revision }) => ({
      model: program.makeModel(state),
      dispatch: engine.dispatchFrom(revision),
    }))
    yield* Effect.raceFirst(engine.await, render(frames))
  }).pipe(Effect.scoped)
