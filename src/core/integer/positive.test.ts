import { assert, describe, prop } from '@effect/vitest'

import * as H from '../test-helpers.ts'
import * as Positive from './positive.ts'

describe.concurrent(`positive integer`, () => {
	prop(`should be ok`, [H.FC.integer({ min: 1 })], ([integer], { expect }) => {
		const result = Positive.fromNumber(integer)
		assert(result._tag === `Some`, `Could not parse number`)
		expect(result.value).toStrictEqual(integer)
	})

	prop(`should return none`, [H.FC.integer({ max: 0 })], ([integer]) => {
		const result = Positive.fromNumber(integer)
		assert(result._tag === `None`, `Number should not be valid`)
	})

	prop(`should be ok`, [H.FC.integer({ min: 1 })], ([integer], { expect }) => {
		const number = Positive.unsafeFromNumber(integer)
		expect(number).toStrictEqual(integer)
	})

	prop(`should crash`, [H.FC.integer({ max: 0 })], ([integer], { expect }) => {
		expect(() => Positive.unsafeFromNumber(integer)).toThrowError()
	})
})
