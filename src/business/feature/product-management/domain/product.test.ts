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
			FastCheck.tuple(
				Arbitrary.make(Integer.Schema),
				Arbitrary.make(Integer.Schema),
			)
				.map(numbers => {
					const [expirationDate, currentDate] = pipe(
						numbers,
						Arr.sortBy(Order.number),
					)

					return {
						currentDate,
						expirationDate,
					}
				})
				.chain(({ currentDate, expirationDate }) =>
					FastCheck.record({
						product: Arbitrary.make(Product.Schema).map(product => ({
							...product,
							maybeExpirationDate: Option.some(expirationDate),
						})),
						currentDate: FastCheck.constant(currentDate),
					}),
				),
		],
		([{ currentDate, product }]) => {
			assert(Option.isSome(product.maybeExpirationDate))
			const isStale = Product.isStale(
				{ ...product, maybeExpirationDate: product.maybeExpirationDate },
				currentDate,
			)

			expect(isStale).toStrictEqual(true)
		},
	)

	prop(
		`Should return false`,
		[
			FastCheck.tuple(
				Arbitrary.make(Integer.Schema),
				Arbitrary.make(Integer.Schema),
			)
				.map(numbers => {
					const [currentDate, expirationDate] = pipe(
						numbers,
						Arr.sortBy(Order.number),
					)

					return {
						currentDate,
						expirationDate,
					}
				})
				.filter(
					({ currentDate, expirationDate }) => expirationDate !== currentDate,
				)
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
		([{ product, currentDate }]) => {
			assert(Option.isSome(product.maybeExpirationDate))
			const isStale = Product.isStale(
				{ ...product, maybeExpirationDate: product.maybeExpirationDate },
				currentDate,
			)

			expect(isStale).toStrictEqual(false)
		},
	)
})

describe.concurrent(`hasExpiration`, () => {
	prop(
		'should return true',
		[
			Arbitrary.make(Integer.Schema).chain(expirationDate =>
				Arbitrary.make(Product.Schema).map(product => ({
					...product,
					maybeExpirationDate: Option.some(expirationDate),
				})),
			),
		],
		([product]) => {
			assert(Option.isSome(product.maybeExpirationDate))

			expect(
				Product.hasExpirationDate({
					...product,
					maybeExpirationDate: product.maybeExpirationDate,
				}),
			).toStrictEqual(true)
		},
	)

	prop(
		'should return false',
		[
			Arbitrary.make(Product.Schema).map(product => ({
				...product,
				maybeExpirationDate: Option.none(),
			})),
		],
		([product]) => {
			assert(Option.isNone(product.maybeExpirationDate))

			expect(
				Product.hasExpirationDate({
					...product,
					maybeExpirationDate: product.maybeExpirationDate,
				}),
			).toStrictEqual(false)
		},
	)
})

describe.concurrent(`timeLeft`, () => {
	prop(
		'should return value',
		[
			FastCheck.tuple(
				Arbitrary.make(Integer.Schema),
				Arbitrary.make(Integer.Schema),
			)
				.map(numbers => {
					const [currentDate, expirationDate] = pipe(
						numbers,
						Arr.sortBy(Order.number),
					)

					return {
						currentDate,
						expirationDate,
					}
				})
				.chain(({ currentDate, expirationDate }) =>
					FastCheck.record({
						product: Arbitrary.make(Product.Schema).map(product => ({
							...product,
							maybeExpirationDate: Option.some(expirationDate),
						})),
						currentDate: FastCheck.constant(currentDate),
					}),
				),
		],
		([{ product, currentDate }]) => {
			assert(Option.isSome(product.maybeExpirationDate))

			expect(
				Product.timeLeft(
					{
						...product,
						maybeExpirationDate: product.maybeExpirationDate,
					},
					currentDate,
				),
			).toStrictEqual(product.maybeExpirationDate.value - currentDate)
		},
	)

	prop(
		'should return 0',
		[
			FastCheck.tuple(
				Arbitrary.make(Integer.Schema),
				Arbitrary.make(Integer.Schema),
			)
				.map(numbers => {
					const [expirationDate, currentDate] = pipe(
						numbers,
						Arr.sortBy(Order.number),
					)

					return {
						currentDate,
						expirationDate,
					}
				})
				.filter(
					({ currentDate, expirationDate }) => currentDate !== expirationDate,
				)
				.chain(({ currentDate, expirationDate }) =>
					FastCheck.record({
						product: Arbitrary.make(Product.Schema).map(product => ({
							...product,
							maybeExpirationDate: Option.some(expirationDate),
						})),
						currentDate: FastCheck.constant(currentDate),
					}),
				),
		],
		([{ product, currentDate }]) => {
			assert(Option.isSome(product.maybeExpirationDate))

			expect(
				Product.timeLeft(
					{
						...product,
						maybeExpirationDate: product.maybeExpirationDate,
					},
					currentDate,
				),
			).toStrictEqual(0)
		},
	)
})

describe.concurrent(`computeFreshness`, () => {
	prop(
		`Should return 0`,
		[
			FastCheck.tuple(
				Arbitrary.make(Integer.Schema),
				Arbitrary.make(Integer.Schema),
				Arbitrary.make(Integer.Schema),
			)
				.map(numbers => {
					const [expirationDate, currentDate, creationDate] = pipe(
						numbers,
						Arr.sortBy(Order.number),
					)

					return {
						currentDate,
						expirationDate,
						creationDate,
					}
				})
				.chain(({ creationDate, currentDate, expirationDate }) =>
					FastCheck.record({
						product: Arbitrary.make(Product.Schema).map(product => ({
							...product,
							maybeExpirationDate: Option.some(expirationDate),
							creationDate,
						})),
						currentDate: FastCheck.constant(currentDate),
					}),
				),
		],
		([{ product, currentDate }]) => {
			assert(Option.isSome(product.maybeExpirationDate))
			const freshness = Product.computeFreshness(
				{ ...product, maybeExpirationDate: product.maybeExpirationDate },
				currentDate,
			)

			expect(freshness).toStrictEqual(0)
		},
	)

	prop(
		`Should return 0`,
		[
			FastCheck.tuple(
				Arbitrary.make(Integer.Schema),
				Arbitrary.make(Integer.Schema),
				Arbitrary.make(Integer.Schema),
			)
				.map(array => {
					const [currentDate, expirationDate, creationDate] = pipe(
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
					({ expirationDate, currentDate }) => expirationDate !== currentDate,
				)
				.chain(({ creationDate, currentDate, expirationDate }) =>
					FastCheck.record({
						product: Arbitrary.make(Product.Schema).map(product => ({
							...product,
							maybeExpirationDate: Option.some(expirationDate),
							creationDate,
						})),
						currentDate: FastCheck.constant(currentDate),
					}),
				),
		],
		([{ product, currentDate }]) => {
			assert(Option.isSome(product.maybeExpirationDate))
			const freshness = Product.computeFreshness(
				{ ...product, maybeExpirationDate: product.maybeExpirationDate },
				currentDate,
			)

			expect(freshness).toStrictEqual(0)
		},
	)

	prop(
		`Should return 1`,
		[
			FastCheck.tuple(
				Arbitrary.make(Integer.Schema),
				Arbitrary.make(Integer.Schema),
				Arbitrary.make(Integer.Schema),
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
				.chain(({ creationDate, currentDate, expirationDate }) =>
					FastCheck.record({
						product: Arbitrary.make(Product.Schema).map(product => ({
							...product,
							maybeExpirationDate: Option.some(expirationDate),
							creationDate,
						})),
						currentDate: FastCheck.constant(currentDate),
					}),
				),
		],
		([{ product, currentDate }]) => {
			assert(Option.isSome(product.maybeExpirationDate))
			const freshness = Product.computeFreshness(
				{ ...product, maybeExpirationDate: product.maybeExpirationDate },
				currentDate,
			)

			expect(freshness).toStrictEqual(1)
		},
	)

	prop(
		`Should return remainingDuration / totalDuration`,
		[
			FastCheck.tuple(
				Arbitrary.make(Integer.Schema),
				Arbitrary.make(Integer.Schema),
				Arbitrary.make(Integer.Schema),
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
				.chain(({ creationDate, currentDate, expirationDate }) =>
					FastCheck.record({
						product: Arbitrary.make(Product.Schema).map(product => ({
							...product,
							maybeExpirationDate: Option.some(expirationDate),
							creationDate,
						})),
						currentDate: FastCheck.constant(currentDate),
					}),
				),
		],
		([{ product, currentDate }]) => {
			assert(Option.isSome(product.maybeExpirationDate))
			const freshness = Product.computeFreshness(
				{ ...product, maybeExpirationDate: product.maybeExpirationDate },
				currentDate,
			)

			expect(freshness).toStrictEqual(
				(product.maybeExpirationDate.value - currentDate) /
					(product.maybeExpirationDate.value - product.creationDate),
			)
		},
	)
})
