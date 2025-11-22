import { assert, describe, expect, prop } from '@effect/vitest'
import * as Arbitrary from 'effect/Arbitrary'
import * as Arr from 'effect/Array'
import * as FastCheck from 'effect/FastCheck'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Order from 'effect/Order'

import * as Integer from '@/core/integer/integer.ts'

import * as Product from './product.ts'

describe.concurrent(`isStale`, () => {
	prop(
		`Should return true`,
		[
			FastCheck.tuple(FastCheck.integer(), FastCheck.integer())
				.map(numbers => {
					const [expirationDate, currentDate] = pipe(
						numbers,
						Arr.sortBy(Order.number),
					)

					return {
						currentDate: Integer.unsafeFromNumber(currentDate),
						expirationDate: Integer.unsafeFromNumber(expirationDate),
					}
				})
				.chain(({ currentDate, expirationDate }) =>
					FastCheck.record({
						product: Arbitrary.make(Product.Schema).map(b => ({
							...b,
							maybeExpirationDate: Option.some(expirationDate),
						})),
						currentDate: FastCheck.constant(currentDate),
					}),
				),
		],
		([{ currentDate, product }]) => {
			assert(Product.hasExpirationDate(product))
			const isStale = Product.isStale(product, currentDate)

			expect(isStale).toStrictEqual(true)
		},
	)

	prop(
		`Should return false`,
		[
			FastCheck.tuple(FastCheck.integer(), FastCheck.integer())
				.map(numbers => {
					const [currentDate, expirationDate] = pipe(
						numbers,
						Arr.sortBy(Order.number),
					)

					return {
						currentDate: Integer.unsafeFromNumber(currentDate),
						expirationDate: Integer.unsafeFromNumber(expirationDate),
					}
				})
				.filter(
					({ currentDate, expirationDate }) => expirationDate !== currentDate,
				),
		],
		([{ expirationDate, currentDate }]) => {
			const isStale = Product.isStale({ expirationDate, currentDate })

			expect(isStale).toStrictEqual(false)
		},
	)
})

describe.concurrent(`computeFreshness`, () => {
	prop(
		`Should return 0`,
		[
			FastCheck.tuple(
				FastCheck.integer(),
				FastCheck.integer(),
				FastCheck.integer(),
			).map(numbers => {
				const [expirationDate, currentDate, creationDate] = pipe(
					numbers,
					Arr.sortBy(Order.number),
				)

				return {
					currentDate: Integer.unsafeFromNumber(currentDate),
					expirationDate: Integer.unsafeFromNumber(expirationDate),
					creationDate: Integer.unsafeFromNumber(creationDate),
				}
			}),
		],
		([{ expirationDate, currentDate, creationDate }]) => {
			const freshness = Product.computeFreshness({
				expirationDate,
				currentDate,
				creationDate,
			})

			expect(freshness).toStrictEqual(0)
		},
	)

	prop(
		`Should return 0`,
		[
			FastCheck.tuple(
				FastCheck.integer(),
				FastCheck.integer(),
				FastCheck.integer(),
			)
				.map(array => {
					const [currentDate, expirationDate, creationDate] = pipe(
						array,
						Arr.sortBy(Order.number),
					)

					return {
						currentDate: Integer.unsafeFromNumber(currentDate),
						expirationDate: Integer.unsafeFromNumber(expirationDate),
						creationDate: Integer.unsafeFromNumber(creationDate),
					}
				})
				.filter(
					({ expirationDate, currentDate }) => expirationDate !== currentDate,
				),
		],
		([{ expirationDate, currentDate, creationDate }]) => {
			const freshness = Product.computeFreshness({
				expirationDate,
				currentDate,
				creationDate,
			})

			expect(freshness).toStrictEqual(0)
		},
	)

	prop(
		`Should return 1`,
		[
			FastCheck.tuple(
				FastCheck.integer(),
				FastCheck.integer(),
				FastCheck.integer(),
			)
				.map(array => {
					const [currentDate, creationDate, expirationDate] = pipe(
						array,
						Arr.sortBy(Order.number),
					)

					return {
						currentDate,
						expirationDate,
						creationDate,
					}
				})
				.filter(
					({ currentDate, creationDate, expirationDate }) =>
						expirationDate !== currentDate &&
						expirationDate !== creationDate &&
						currentDate !== creationDate,
				)
				.map(({ expirationDate, currentDate, creationDate }) => ({
					expirationDate: Integer.unsafeFromNumber(expirationDate),
					currentDate: Integer.unsafeFromNumber(currentDate),
					creationDate: Integer.unsafeFromNumber(creationDate),
				})),
		],
		([{ expirationDate, currentDate, creationDate }]) => {
			const freshness = Product.computeFreshness({
				expirationDate,
				currentDate,
				creationDate,
			})

			expect(freshness).toStrictEqual(1)
		},
	)

	prop(
		`Should return remainingDuration / totalDuration`,
		[
			FastCheck.tuple(
				FastCheck.integer(),
				FastCheck.integer(),
				FastCheck.integer(),
			)
				.map(array => {
					const [creationDate, currentDate, expirationDate] = pipe(
						array,
						Arr.sortBy(Order.number),
					)

					return {
						currentDate,
						expirationDate,
						creationDate,
					}
				})
				.filter(
					({ currentDate, creationDate, expirationDate }) =>
						expirationDate !== currentDate && expirationDate !== creationDate,
				)
				.map(({ expirationDate, currentDate, creationDate }) => ({
					expirationDate: Integer.unsafeFromNumber(expirationDate),
					currentDate: Integer.unsafeFromNumber(currentDate),
					creationDate: Integer.unsafeFromNumber(creationDate),
				})),
		],
		([{ expirationDate, currentDate, creationDate }]) => {
			const freshness = Product.computeFreshness({
				expirationDate,
				currentDate,
				creationDate,
			})

			expect(freshness).toStrictEqual(
				(expirationDate - currentDate) / (expirationDate - creationDate),
			)
		},
	)
})
