// Shared by every entrypoint: starts the engine and renders. It must not
// import anything environment-specific (sqlite, hot reload, …).
import * as Browser from '@effect/platform-browser'
import * as Tea from '@fgaudo/effect-tea'
import * as Cause from 'effect/Cause'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import type * as Layer from 'effect/Layer'
import type * as Stream from 'effect/Stream'
import type { VNode } from 'snabbdom'
import * as App from '#app/program.ts'
import * as Fonts from '#infrastructure/fonts.ts'
import * as SplashScreen from '#infrastructure/splash-screen.ts'
import { SnabbdomRenderer } from '#libs/tea-snabbdom/renderer.ts'

export class RootViews extends Context.Service<
  RootViews,
  Stream.Stream<Tea.View<App.Model, App.Message, VNode>>
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
  )
})

// `onCrash` runs when the program ends by anything but the page's discarding, which interrupts it: the program never
// ends by itself, so that end is a bug. The runtime writes the cause to the console once the program has ended;
// `onCrash` never recovers from it.
export const run = (layer: Layer.Layer<App.Deps | RootViews | SnabbdomRenderer>, onCrash: Effect.Effect<void>) =>
  Browser.BrowserRuntime.runMain(
    program.pipe(
      Effect.provide(layer),
      Effect.tapCause((cause) => Cause.hasInterruptsOnly(cause) ? Effect.void : onCrash),
    ),
  )
