import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as Snabbdom from 'snabbdom'
import type * as View from '@/libs/elm/view.ts'

export type Frame<Model, Message> = Readonly<{
  model: Model
  dispatch: View.Dispatch<Message>
}>

const nextAnimationFrame = Effect.callback<void>((resume) => {
  const id = requestAnimationFrame(() => resume(Effect.void))
  return Effect.sync(() => cancelAnimationFrame(id))
})

export class SnabbdomRenderer extends Context.Service<
  SnabbdomRenderer,
  {
    /** Renders at most once per animation frame: intermediate frames are dropped, like Elm does. */
    render: <Model, Message>(options: {
      frame$: Stream.Stream<Frame<Model, Message>>
      view$: Stream.Stream<View.View<Model, Message>>
    }) => Effect.Effect<void>
  }
>()('01707e0c43c8de6e', {
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
      render: ({ frame$, view$ }) =>
        Stream.zipLatest(frame$, view$).pipe(
          // Keep only the newest pair while waiting for the next frame.
          Stream.buffer({ capacity: 1, strategy: 'sliding' }),
          // The accumulator is the previously rendered tree.
          Stream.runFoldEffect(
            (): Element | Snabbdom.VNode => root,
            (previous, [{ model, dispatch }, view]) =>
              Effect.andThen(
                nextAnimationFrame,
                Effect.sync(() => patch(previous, view(model, dispatch))),
              ),
          ),
          Effect.asVoid,
        ),
    }
  }),
}) {
  static layer = (selector: string) => Layer.effect(this, this.make(selector))
}
