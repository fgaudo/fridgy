import {
	assert,
	describe,
	effect,
} from '@effect/vitest'

import * as H from '$lib/core/test-helpers.ts'

import { Eff } from '../imports.ts'
import {
	fromNumber,
	unsafe_fromNumber,
} from './positive.ts'

describe('positive integer', () => {
	effect.prop(
		'should be ok',
		[H.FC.integer({ min: 1 })],
		([integer], { expect }) =>
			Eff.gen(function* () {
				const result = fromNumber(integer)
				assert(
					result._tag === 'Some',
					'Could not parse number',
				)
				expect(result.value).toStrictEqual(
					integer,
				)

				yield* Eff.void
			}),
	)

	effect.prop(
		'should return none',
		[H.FC.integer({ max: 0 })],
		([integer]) =>
			Eff.gen(function* () {
				const result = fromNumber(integer)
				assert(
					result._tag === 'None',
					'Number should not be valid',
				)

				yield* Eff.void
			}),
	)

	effect.prop(
		'should be ok',
		[H.FC.integer({ min: 1 })],
		([integer], { expect }) =>
			Eff.gen(function* () {
				const number = unsafe_fromNumber(integer)
				expect(number).toStrictEqual(integer)

				yield* Eff.void
			}),
	)

	effect.prop(
		'should crash',
		[H.FC.integer({ max: 0 })],
		([integer], { expect }) =>
			Eff.gen(function* () {
				expect(() =>
					unsafe_fromNumber(integer),
				).toThrowError()

				yield* Eff.void
			}),
	)
})
