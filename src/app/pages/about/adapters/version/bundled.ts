import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { version } from '#package.json'
import { Version } from '../../ports/version.ts'

export const layer = Layer.succeed(Version, {
  current: Effect.succeed(version),
})
