import { assert, describe, effect } from '@effect/vitest'
import * as Effect from 'effect/Effect'

import * as H from '$lib/core/test-helpers.ts'

import * as NonNegative from './non-negative.ts'

const fcInvalidNumber = H.FC.oneof(
	H.FC.integer({ max: -1 }),
	H.FC.double().filter(value => !Number.isInteger(value)),
)

describe.concurrent(`non-negative integer`, () => {
	effect.prop(`should be ok`, [H.FC.nat()], ([integer], { expect }) =>
		Effect.gen(function* () {
			const result = NonNegative.fromNumber(integer)
			assert(result._tag === `Some`, `Could not parse number`)
			expect(result.value).toStrictEqual(integer)

			yield* Effect.void
		}),
	)

	effect.prop(
		`should return none`,
		[fcInvalidNumber],

		([integer]) =>
			Effect.gen(function* () {
				const result = NonNegative.fromNumber(integer)
				assert(result._tag === `None`, `Number should not be valid`)

				yield* Effect.void
			}),
	)

	effect.prop(`should be ok`, [H.FC.nat()], ([integer], { expect }) =>
		Effect.gen(function* () {
			const number = NonNegative.unsafeFromNumber(integer)
			expect(number).toStrictEqual(integer)

			yield* Effect.void
		}),
	)

	effect.prop(`should crash`, [fcInvalidNumber], ([integer], { expect }) =>
		Effect.gen(function* () {
			expect(() => NonNegative.unsafeFromNumber(integer)).toThrowError()

			yield* Effect.void
		}),
	)
})
