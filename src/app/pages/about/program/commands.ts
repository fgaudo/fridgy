import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as Random from 'effect/Random'
import { Licenses } from '../ports/licenses.ts'
import { Sayings } from '../ports/sayings.ts'
import { InternalMessage } from './messages.ts'

export const loadLicenses = Effect.gen(function*() {
  const { all } = yield* Licenses
  return Opt.some(InternalMessage.LicensesLoaded({ licenses: yield* all }))
})

export const pickSaying = Effect.gen(function*() {
  const { all } = yield* Sayings
  const maybeSaying = yield* Effect.option(Random.choice(yield* all))
  return Opt.some(InternalMessage.SayingPicked({ maybeSaying }))
})
