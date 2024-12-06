import { fc, test } from '@fast-check/vitest'
import { assert, describe, expect } from 'vitest'

import {
	fromNumber,
	unsafe_fromNumber,
} from './positive.ts'

describe('positive integer', () => {
	test.concurrent.prop([fc.integer({ min: 1 })])(
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

	test.concurrent.prop([fc.integer({ max: 0 })])(
		'should return none',
		integer => {
			const result = fromNumber(integer)
			assert(
				result._tag === 'None',
				'Number should not be valid',
			)
		},
	)

	test.concurrent.prop([fc.integer({ min: 1 })])(
		'should be ok',
		integer => {
			const number = unsafe_fromNumber(integer)
			expect(number).toStrictEqual(integer)
		},
	)

	test.concurrent.prop([fc.integer({ max: 0 })])(
		'should crash',
		integer => {
			expect(() =>
				unsafe_fromNumber(integer),
			).toThrowError()
		},
	)
})
