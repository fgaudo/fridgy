// Shared by every entrypoint: starts the engine and renders. It must not
// import anything environment-specific (sqlite, hot reload, …).
import * as Browser from '@effect/platform-browser'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import type * as Layer from 'effect/Layer'
import type * as Stream from 'effect/Stream'
import * as App from '#app/program.ts'
import * as Fonts from '#infrastructure/fonts.ts'
import { SnabbdomRenderer } from '#libs/tea-snabbdom/renderer.ts'
import * as SplashScreen from '#infrastructure/splash-screen.ts'
import * as Tea from '@fgaudo/effect-tea'
import type { VNode } from 'snabbdom'

export class RootViews extends Context.Service<
  RootViews,
  Stream.Stream<Tea.View<App.Model, VNode>>
>()('7e2b556446628b98') {}

const program = Effect.gen(function*() {
  const renderer = yield* SnabbdomRenderer
  const views = yield* RootViews
  yield* Tea.run(
    App.program,
    (frames) =>
      renderer.render({
        frame$: frames,
        view$: views,
        onFirstPaint: Effect.logInfo('First view displayed').pipe(
          Effect.andThen(Fonts.loaded),
          Effect.andThen(SplashScreen.hide),
        ),
      }),
    { onRejectedInput: 'die' },
  )
})

export const run = (layer: Layer.Layer<App.Deps | RootViews | SnabbdomRenderer>) =>
  Browser.BrowserRuntime.runMain(
    program.pipe(Effect.provide(layer)),
  )
