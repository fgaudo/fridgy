// Shared by every entrypoint: starts the engine and renders. It must not
// import anything environment-specific (sqlite, hot reload, …).
import * as Browser from '@effect/platform-browser'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import type * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as App from '@/app/program.ts'
import * as Fonts from '@/infra/fonts.ts'
import { SnabbdomRenderer } from '@/infra/snabbdom-renderer.ts'
import * as SplashScreen from '@/infra/splash-screen.ts'
import * as Engine from '@/libs/elm/engine.ts'
import type { View } from '@/libs/elm/view.ts'

export class RootViews extends Context.Service<
  RootViews,
  Stream.Stream<View<App.Model, App.Message>>
>()('7e2b556446628b98') {}

const program = Effect.gen(function*() {
  const engine = yield* Engine.make(App.program)
  const renderer = yield* SnabbdomRenderer
  const views = yield* RootViews
  // Whichever ends first ends the app: a dead engine or a failed render.
  yield* Effect.raceFirst(
    engine.await,
    renderer.render({
      frame$: Stream.map(engine.state$, ({ state, revision }) => ({
        model: App.program.makeModel(state),
        dispatch: engine.dispatchFrom(revision),
      })),
      view$: views,
      onFirstPaint: Effect.andThen(Fonts.loaded, SplashScreen.hide),
    }),
  )
})

export const run = (layer: Layer.Layer<App.Deps | RootViews | SnabbdomRenderer>) =>
  Browser.BrowserRuntime.runMain(
    program.pipe(Effect.scoped, Effect.provide(layer)),
  )
