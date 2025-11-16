import { assert, describe, prop } from '@effect/vitest'

import * as H from '../test-helpers.ts'
import { fromNumber, unsafeFromNumber } from './integer.ts'

describe.concurrent(`integer`, () => {
	prop(`should be ok`, [H.FC.integer()], ([integer], { expect }) => {
		const result = fromNumber(integer)
		assert(result._tag === `Some`, `Could not parse number`)
		expect(result.value).toStrictEqual(integer)
	})

	prop(`should be ok`, [H.FC.integer()], ([integer], { expect }) => {
		const number = unsafeFromNumber(integer)
		expect(number).toStrictEqual(integer)
	})

	prop(
		`should crash`,
		[
			H.FC.oneof(H.FC.float(), H.FC.double()).filter(
				value => !Number.isInteger(value),
			),
		],
		([integer], { expect }) => {
			expect(() => unsafeFromNumber(integer)).toThrowError()
		},
	)
})
