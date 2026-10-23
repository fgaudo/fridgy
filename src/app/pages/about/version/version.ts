import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class Version extends Context.Service<
  Version,
  {
    readonly current: Effect.Effect<string>
  }
>()('48501fccc61a5614') {}
