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
} from './index.ts'

describe('integer', () => {
	effect.prop(
		'should be ok',
		[H.FC.integer()],
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
		'should be ok',
		[H.FC.integer()],

		([integer], { expect }) =>
			Eff.gen(function* () {
				const number = unsafe_fromNumber(integer)
				expect(number).toStrictEqual(integer)

				yield* Eff.void
			}),
	)

	effect.prop(
		'should crash',
		[
			H.FC.oneof(
				H.FC.float(),
				H.FC.double(),
			).filter(value => !Number.isInteger(value)),
		],

		([integer], { expect }) =>
			Eff.gen(function* () {
				expect(() =>
					unsafe_fromNumber(integer),
				).toThrowError()

				yield* Eff.void
			}),
	)
})
