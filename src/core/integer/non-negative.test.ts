import { fc, test } from '@fast-check/vitest'
import { assert, describe, expect } from 'vitest'

import {
	fromNumber,
	unsafe_fromNumber,
} from './non-negative.ts'

const fcInvalidNumber = fc.oneof(
	fc.integer({ max: -1 }),
	fc
		.double()
		.filter(value => !Number.isInteger(value)),
)

describe('non-negative integer', () => {
	test.concurrent.prop([fc.nat()])(
		'should be ok',
		integer => {
			const result = fromNumber(integer)
			assert(
				result._tag === 'Some',
				'Could not parse number',
			)
			expect(result.value).toStrictEqual(integer)
		},
	)

	test.concurrent.prop([fcInvalidNumber])(
		'should return none',
		integer => {
			const result = fromNumber(integer)
			assert(
				result._tag === 'None',
				'Number should not be valid',
			)
		},
	)

	test.concurrent.prop([fc.nat()])(
		'should be ok',
		integer => {
			const number = unsafe_fromNumber(integer)
			expect(number).toStrictEqual(integer)
		},
	)

	test.concurrent.prop([fcInvalidNumber])(
		'should crash',
		integer => {
			expect(() =>
				unsafe_fromNumber(integer),
			).toThrowError()
		},
	)
})
