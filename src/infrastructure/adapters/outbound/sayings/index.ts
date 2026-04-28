import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import * as GetSayings from '@/app/ports/outbound/get-sayings.ts'

import * as Sayings from './sayings.json' with { type: 'json' }

export const layer = Layer.succeed(
  GetSayings.GetSayings,
  Effect.succeed(Sayings),
)
