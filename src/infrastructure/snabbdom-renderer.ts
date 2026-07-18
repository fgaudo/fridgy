import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { flow } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as Snabbdom from 'snabbdom'

export class SnabbdomRenderer extends Context.Service<
  SnabbdomRenderer,
  {
    render: (views: Stream.Stream<Snabbdom.VNode>) => Effect.Effect<void>
  }
>()('01707e0c43c8de6e', {
  make: Effect.fn(function*(selector: string) {
    const root = yield* Effect.sync(() => document.querySelector(selector)!)
      .pipe(
        Effect.tapDefect((error) => Effect.logFatal('Error while reading root query selector', error)),
      )
    const containerRef = yield* SynchronizedRef.make<Element | Snabbdom.VNode>(
      root,
    )
    const patch = yield* Effect.sync(() =>
      Snabbdom.init([
        Snabbdom.classModule,
        Snabbdom.propsModule,
        Snabbdom.styleModule,
        Snabbdom.attributesModule,
        Snabbdom.eventListenersModule,
      ])
    )
    return {
      render: flow(
        Stream.mapEffect((vnode) =>
          SynchronizedRef.updateEffect(
            containerRef,
            (node) => Effect.sync(() => patch(node, vnode)),
          )
        ),
        Stream.runDrain,
      ),
    }
  }),
}) {
  static layer = (selector: string) => Layer.effect(this, this.make(selector))
}
