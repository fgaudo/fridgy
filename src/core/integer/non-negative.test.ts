import { fc, test } from '@fast-check/vitest'
import { assert, describe, expect } from 'vitest'

import {
	fromNumber,
	unsafe_fromNumber,
} from './non-negative.ts'

describe('integer', () => {
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

	test.concurrent.prop([fc.nat()])(
		'should be ok',
		integer => {
			const number = unsafe_fromNumber(integer)
			expect(number).toStrictEqual(integer)
		},
	)
})
