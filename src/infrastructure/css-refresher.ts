import * as Clock from 'effect/Clock'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

export class CssRefresher extends Context.Service<CssRefresher>()(
  'de19dec15a8c14e9',
  {
    make: Effect.fn(function*(cssSelector: string) {
      const cssLinkElement = yield* Effect.sync(() => document.querySelector(cssSelector)!).pipe(
        Effect.tapDefect((error) => Effect.logFatal('Error while reading css selector', error)),
      )
      return Effect.gen(function*() {
        const millis = yield* Clock.currentTimeMillis
        const href = yield* Effect.sync(() => cssLinkElement.getAttribute('href')!).pipe(
          Effect.tapDefect((error) => Effect.logFatal('Error while reading href attribute of css', error)),
        )
        const url = new URL(href, window.location.origin)
        url.searchParams.set('t', millis.toString())
        yield* Effect.sync(() => {
          cssLinkElement.setAttribute('href', url.toString())
        })
      })
    }),
  },
) {
  static layer = (selector: string) => Layer.effect(this, this.make(selector))
}
