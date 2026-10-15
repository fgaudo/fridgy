import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class Sayings extends Context.Service<
  Sayings,
  {
    readonly all: Effect.Effect<ReadonlyArray<string>>
  }
>()('1620ae14e85e7b6b') {}
