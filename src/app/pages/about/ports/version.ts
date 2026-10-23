import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class Version extends Context.Service<
  Version,
  {
    readonly current: Effect.Effect<string>
  }
>()('4ef5a2dc73963ee4') {}
