import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'

export class LinksError extends Data.TaggedError('LinksError')<{
  readonly cause: unknown
}> {}

/** The platform's opening of a URL, which the programs use directly: a link means the same to every one of them. */
export class Links extends Context.Service<
  Links,
  {
    /** Fails when nothing on the device opens `url`. */
    readonly open: (url: string) => Effect.Effect<void, LinksError>
  }
>()('c719e12137c735da') {}

/** A program's command to open a link. A link nothing opens is logged: it answers nothing. */
export const openLink = Effect.fn('OpenLink')(
  function*({ url }: Readonly<{ url: string }>) {
    const { open } = yield* Links
    yield* open(url).pipe(
      Effect.catchTag('LinksError', (error) => Effect.logWarning('Could not open a link', error.cause)),
    )
    return Opt.none()
  },
  Effect.withLogSpan('OpenLink'),
)
