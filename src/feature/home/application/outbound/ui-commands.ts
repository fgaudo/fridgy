import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class UiCommands extends Context.Service<
  UiCommands,
  { scrollToTop: Effect.Effect<void> }
>()('49bc3112e281fa83') {}
