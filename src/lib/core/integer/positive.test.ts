import { assert, describe, effect } from '@effect/vitest'
import * as Effect from 'effect/Effect'

import * as H from '$lib/core/test-helpers.ts'

import * as Positive from './positive.ts'

describe.concurrent(`positive integer`, () => {
	effect.prop(
		`should be ok`,
		[H.FC.integer({ min: 1 })],
		([integer], { expect }) =>
			Effect.gen(function* () {
				const result = Positive.fromNumber(integer)
				assert(result._tag === `Some`, `Could not parse number`)
				expect(result.value).toStrictEqual(integer)

				yield* Effect.void
			}),
	)

	effect.prop(`should return none`, [H.FC.integer({ max: 0 })], ([integer]) =>
		Effect.gen(function* () {
			const result = Positive.fromNumber(integer)
			assert(result._tag === `None`, `Number should not be valid`)

			yield* Effect.void
		}),
	)

	effect.prop(
		`should be ok`,
		[H.FC.integer({ min: 1 })],
		([integer], { expect }) =>
			Effect.gen(function* () {
				const number = Positive.unsafeFromNumber(integer)
				expect(number).toStrictEqual(integer)

				yield* Effect.void
			}),
	)

	effect.prop(
		`should crash`,
		[H.FC.integer({ max: 0 })],
		([integer], { expect }) =>
			Effect.gen(function* () {
				expect(() => Positive.unsafeFromNumber(integer)).toThrowError()

				yield* Effect.void
			}),
	)
})
