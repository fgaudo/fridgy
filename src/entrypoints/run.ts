// Shared by every entrypoint: starts the engine and renders. It must not
// import anything environment-specific (sqlite, hot reload, …).
import * as Browser from '@effect/platform-browser'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import type * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as App from '@/app/program.ts'
import { SnabbdomRenderer } from '@/infra/snabbdom-renderer.ts'
import * as Engine from '@/libs/elm/engine.ts'
import type { View } from '@/libs/elm/view.ts'

/** Where the root view comes from: built in, or hot reloaded. */
export class RootViews extends Context.Service<
  RootViews,
  Stream.Stream<View<App.Model, App.InternalMessage>>
>()('7e2b556446628b98') {}

const program = Effect.gen(function*() {
  const engine = yield* Engine.make(App.program)
  const renderer = yield* SnabbdomRenderer
  const views = yield* RootViews
  // Whichever ends first ends the app: a dead engine or a failed render.
  yield* Effect.raceFirst(
    engine.await,
    renderer.render({
      model$: Stream.map(engine.state$, App.program.makeModel),
      view$: views,
      dispatch: engine.dispatch,
    }),
  )
})

export const run = (layer: Layer.Layer<App.Deps | RootViews | SnabbdomRenderer>) =>
  Browser.BrowserRuntime.runMain(
    program.pipe(Effect.scoped, Effect.provide(layer)),
  )
