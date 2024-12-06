import { fc, test } from '@fast-check/vitest'
import { assert, describe, expect } from 'vitest'

import {
	fromNumber,
	unsafe_fromNumber,
} from './index.ts'

describe('integer', () => {
	test.concurrent.prop([fc.integer()])(
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

	test.concurrent.prop([fc.integer()])(
		'should be ok',
		integer => {
			const number = unsafe_fromNumber(integer)
			expect(number).toStrictEqual(integer)
		},
	)

	test.concurrent.prop([
		fc
			.oneof(fc.float(), fc.double())
			.filter(value => !Number.isInteger(value)),
	])('should crash', integer => {
		expect(() =>
			unsafe_fromNumber(integer),
		).toThrowError()
	})
})
