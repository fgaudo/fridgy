import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import * as GetSayings from '../../../../../about/outbound/get-sayings'

import * as Sayings from './sayings.json' with { type: 'json' }

export const layer = Layer.succeed(
  GetSayings.GetSayings,
  Effect.succeed(Sayings),
)
