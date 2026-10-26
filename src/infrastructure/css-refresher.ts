import * as Clock from 'effect/Clock'
import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

export class CssLoadError extends Data.TaggedError('CssLoadError')<{ readonly href: string }> {}

const findLink = (selector: string) =>
  Effect.sync(() => document.querySelector<HTMLLinkElement>(selector)).pipe(
    Effect.flatMap(Effect.fromNullishOr),
    Effect.catch(() => Effect.die(new Error(`Stylesheet link "${selector}" not found`))),
  )

/** Resolves once `link` has loaded its stylesheet; removes it if the load fails or is interrupted. */
const loaded = (link: HTMLLinkElement) =>
  Effect.callback<void, CssLoadError>((resume) => {
    link.onload = () => resume(Effect.void)
    link.onerror = () => {
      link.remove()
      resume(Effect.fail(new CssLoadError({ href: link.href })))
    }
    return Effect.sync(() => link.remove())
  })

export class CssRefresher extends Context.Service<
  CssRefresher,
  {
    /**
     * Loads the stylesheet anew next to the current one and swaps them only once it is ready: changing the `href`
     * in place would leave the page unstyled while it downloads.
     */
    readonly refresh: Effect.Effect<void, CssLoadError>
  }
>()('de19dec15a8c14e9', {
  make: Effect.fn(function*(selector: string) {
    // Fails fast at startup if the page has no such link.
    yield* findLink(selector)
    const refresh = Effect.gen(function*() {
      const current = yield* findLink(selector)
      const millis = yield* Clock.currentTimeMillis
      const next = yield* Effect.sync(() => {
        const url = new URL(current.getAttribute('href') ?? '', window.location.origin)
        url.searchParams.set('t', millis.toString())
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = url.toString()
        current.after(link)
        return link
      })
      yield* loaded(next)
      yield* Effect.sync(() => {
        current.remove()
        next.id = current.id
      })
    })
    return { refresh }
  }),
}) {
  static layer = (selector: string) => Layer.effect(this, this.make(selector))
}
