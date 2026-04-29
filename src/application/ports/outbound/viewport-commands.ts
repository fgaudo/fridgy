import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class ViewportCommands extends Context.Service<
  ViewportCommands,
  {
    scrollTo: (opt: ScrollToOptions) => Effect.Effect<void>
    isWindowAtTop: Effect.Effect<boolean>
  }
>()('de09ac17be446a13') {}
