import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'

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
