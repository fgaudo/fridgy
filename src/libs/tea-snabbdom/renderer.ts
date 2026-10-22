import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as Snabbdom from 'snabbdom'
import type { Frame, View } from '@fgaudo/effect-tea'
import * as AnimationFrame from '#libs/animation-frame/animation-frame.ts'

export class SnabbdomRenderer extends Context.Service<
  SnabbdomRenderer,
  {
    /** Renders at most once per animation frame: intermediate frames are dropped, like Elm does. */
    render: <Model>(options: {
      frame$: Stream.Stream<Frame<Model>>
      view$: Stream.Stream<View<Model, Snabbdom.VNode>>
      /** Runs once, after the first tree has been displayed. */
      onFirstPaint: Effect.Effect<void>
    }) => Effect.Effect<void>
  }
>()('be6dc6ffab00a36c', {
  make: Effect.fn(function*(selector: string) {
    const root = yield* Effect.sync(() => document.querySelector(selector)).pipe(
      Effect.flatMap(Effect.fromNullishOr),
      Effect.catch(() => Effect.die(new Error(`Root element "${selector}" not found`))),
    )
    const patch = Snabbdom.init([
      Snabbdom.classModule,
      Snabbdom.propsModule,
      Snabbdom.styleModule,
      Snabbdom.attributesModule,
      Snabbdom.eventListenersModule,
    ])
    return {
      render: ({ frame$, view$, onFirstPaint }) =>
        Stream.zipLatest(frame$, view$).pipe(
          // Keep only the newest pair while waiting for the next frame.
          Stream.buffer({ capacity: 1, strategy: 'sliding' }),
          // The accumulator is the previously rendered tree.
          Stream.runFoldEffect(
            (): Element | Snabbdom.VNode => root,
            // Untraced: it runs on every frame.
            Effect.fnUntraced(function*(previous, [{ model, dispatch }, view]) {
              yield* AnimationFrame.next
              const next = yield* Effect.sync(() => patch(previous, view(model, dispatch)))
              if (previous === root) {
                // The patch runs right before a paint: one more frame
                // guarantees the first tree has been displayed.
                yield* AnimationFrame.next
                yield* onFirstPaint
              }
              return next
            }),
          ),
          Effect.asVoid,
        ),
    }
  }),
}) {
  static layer = (selector: string) => Layer.effect(this, this.make(selector))
}
