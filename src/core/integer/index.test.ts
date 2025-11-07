import { assert, describe, effect } from '@effect/vitest'
import * as Effect from 'effect/Effect'

import * as H from '../test-helpers.ts'
import { fromNumber, unsafeFromNumber } from './index.ts'

describe.concurrent(`integer`, () => {
	effect.prop(
		`should be ok`,
		[H.FC.integer()],
		Effect.fn(function* ([integer], { expect }) {
			const result = fromNumber(integer)
			assert(result._tag === `Some`, `Could not parse number`)
			expect(result.value).toStrictEqual(integer)

			yield* Effect.void
		}),
	)

	effect.prop(
		`should be ok`,
		[H.FC.integer()],
		Effect.fn(function* ([integer], { expect }) {
			const number = unsafeFromNumber(integer)
			expect(number).toStrictEqual(integer)

			yield* Effect.void
		}),
	)

	effect.prop(
		`should crash`,
		[
			H.FC.oneof(H.FC.float(), H.FC.double()).filter(
				value => !Number.isInteger(value),
			),
		],
		Effect.fn(function* ([integer], { expect }) {
			expect(() => unsafeFromNumber(integer)).toThrowError()

			yield* Effect.void
		}),
	)
})
