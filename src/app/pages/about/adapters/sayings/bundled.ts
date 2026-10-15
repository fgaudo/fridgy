import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { Sayings } from '../../ports/sayings.ts'
import sayings from './sayings.json' with { type: 'json' }

export const layer = Layer.succeed(Sayings, {
  all: Effect.succeed(sayings),
})
