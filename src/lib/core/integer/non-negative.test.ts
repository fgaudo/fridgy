import { assert, describe, effect } from '@effect/vitest'

import * as H from '$lib/core/test-helpers.ts'

import { Eff } from '../imports.ts'
import { fromNumber, unsafe_fromNumber } from './non-negative.ts'

const fcInvalidNumber = H.FC.oneof(
	H.FC.integer({ max: -1 }),
	H.FC.double().filter(value => !Number.isInteger(value)),
)

describe(`non-negative integer`, () => {
	effect.prop(`should be ok`, [H.FC.nat()], ([integer], { expect }) =>
		Eff.gen(function* () {
			const result = fromNumber(integer)
			assert(result._tag === `Some`, `Could not parse number`)
			expect(result.value).toStrictEqual(integer)

			yield* Eff.void
		}),
	)

	effect.prop(
		`should return none`,
		[fcInvalidNumber],

		([integer]) =>
			Eff.gen(function* () {
				const result = fromNumber(integer)
				assert(result._tag === `None`, `Number should not be valid`)

				yield* Eff.void
			}),
	)

	effect.prop(`should be ok`, [H.FC.nat()], ([integer], { expect }) =>
		Eff.gen(function* () {
			const number = unsafe_fromNumber(integer)
			expect(number).toStrictEqual(integer)

			yield* Eff.void
		}),
	)

	effect.prop(`should crash`, [fcInvalidNumber], ([integer], { expect }) =>
		Eff.gen(function* () {
			expect(() => unsafe_fromNumber(integer)).toThrowError()

			yield* Eff.void
		}),
	)
})
