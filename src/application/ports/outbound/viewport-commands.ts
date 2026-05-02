import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class ViewportCommands extends Context.Service<
  ViewportCommands,
  {
    scrollToTop: Effect.Effect<void>
    closeApp: Effect.Effect<void>
  }
>()('de09ac17be446a13') {}
