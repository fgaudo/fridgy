import { assert, describe, expect, layer } from '@effect/vitest'
import * as Arbitrary from 'effect/Arbitrary'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as FastCheck from 'effect/FastCheck'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Order from 'effect/Order'

import * as Integer from '@/core/integer/integer.ts'

import * as Product from './product.ts'

describe.concurrent(`isStale`, () => {
	layer(Product.ProductService.Default)(({ effect }) =>
		effect.prop(
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
			Effect.fn(function* ([{ currentDate, product }]) {
				assert(Option.isSome(product.maybeExpirationDate))

				const { isStale } = yield* Product.ProductService

				const isStaleResult = isStale(
					{ ...product, maybeExpirationDate: product.maybeExpirationDate },
					currentDate,
				)

				expect(isStaleResult).toStrictEqual(true)
			}),
		),
	)

	layer(Product.ProductService.Default)(({ effect }) =>
		effect.prop(
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
			Effect.fn(function* ([{ currentDate, product }]) {
				assert(Option.isSome(product.maybeExpirationDate))

				const { isStale } = yield* Product.ProductService

				const isStaleResult = isStale(
					{ ...product, maybeExpirationDate: product.maybeExpirationDate },
					currentDate,
				)

				expect(isStaleResult).toStrictEqual(false)
			}),
		),
	)
})

describe.concurrent(`hasExpiration`, () => {
	layer(Product.ProductService.Default)(({ effect }) =>
		effect.prop(
			'should return true',
			[
				Arbitrary.make(Integer.Schema).chain(expirationDate =>
					Arbitrary.make(Product.Schema).map(product => ({
						...product,
						maybeExpirationDate: Option.some(expirationDate),
					})),
				),
			],
			Effect.fn(function* ([product]) {
				assert(Option.isSome(product.maybeExpirationDate))

				const { hasExpirationDate } = yield* Product.ProductService

				expect(
					hasExpirationDate({
						...product,
						maybeExpirationDate: product.maybeExpirationDate,
					}),
				).toStrictEqual(true)
			}),
		),
	)

	layer(Product.ProductService.Default)(({ effect }) =>
		effect.prop(
			'should return false',
			[
				Arbitrary.make(Product.Schema).map(product => ({
					...product,
					maybeExpirationDate: Option.none(),
				})),
			],
			Effect.fn(function* ([product]) {
				const { hasExpirationDate } = yield* Product.ProductService

				expect(
					hasExpirationDate({
						...product,
						maybeExpirationDate: product.maybeExpirationDate,
					}),
				).toStrictEqual(false)
			}),
		),
	)
})

describe.concurrent(`timeLeft`, () => {
	layer(Product.ProductService.Default)(({ effect }) =>
		effect.prop(
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
			Effect.fn(function* ([{ currentDate, product }]) {
				assert(Option.isSome(product.maybeExpirationDate))

				const { timeLeft } = yield* Product.ProductService

				expect(
					timeLeft(
						{
							...product,
							maybeExpirationDate: product.maybeExpirationDate,
						},
						currentDate,
					),
				).toStrictEqual(product.maybeExpirationDate.value - currentDate)
			}),
		),
	)

	layer(Product.ProductService.Default)(({ effect }) =>
		effect.prop(
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
			Effect.fn(function* ([{ currentDate, product }]) {
				assert(Option.isSome(product.maybeExpirationDate))

				const { timeLeft } = yield* Product.ProductService

				expect(
					timeLeft(
						{
							...product,
							maybeExpirationDate: product.maybeExpirationDate,
						},
						currentDate,
					),
				).toStrictEqual(0)
			}),
		),
	)
})

describe.concurrent(`computeFreshness`, () => {
	layer(Product.ProductService.Default)(({ effect }) =>
		effect.prop(
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
			Effect.fn(function* ([{ currentDate, product }]) {
				assert(Option.isSome(product.maybeExpirationDate))

				const { computeFreshness } = yield* Product.ProductService

				const freshness = computeFreshness(
					{ ...product, maybeExpirationDate: product.maybeExpirationDate },
					currentDate,
				)

				expect(freshness).toStrictEqual(0)
			}),
		),
	)

	layer(Product.ProductService.Default)(({ effect }) =>
		effect.prop(
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
			Effect.fn(function* ([{ currentDate, product }]) {
				assert(Option.isSome(product.maybeExpirationDate))

				const { computeFreshness } = yield* Product.ProductService

				const freshness = computeFreshness(
					{ ...product, maybeExpirationDate: product.maybeExpirationDate },
					currentDate,
				)

				expect(freshness).toStrictEqual(0)
			}),
		),
	)

	layer(Product.ProductService.Default)(({ effect }) =>
		effect.prop(
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
			Effect.fn(function* ([{ currentDate, product }]) {
				assert(Option.isSome(product.maybeExpirationDate))

				const { computeFreshness } = yield* Product.ProductService

				const freshness = computeFreshness(
					{ ...product, maybeExpirationDate: product.maybeExpirationDate },
					currentDate,
				)

				expect(freshness).toStrictEqual(1)
			}),
		),
	)

	layer(Product.ProductService.Default)(({ effect }) =>
		effect.prop(
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
			Effect.fn(function* ([{ currentDate, product }]) {
				assert(Option.isSome(product.maybeExpirationDate))

				const { computeFreshness } = yield* Product.ProductService

				const freshness = computeFreshness(
					{ ...product, maybeExpirationDate: product.maybeExpirationDate },
					currentDate,
				)

				expect(freshness).toStrictEqual(
					(product.maybeExpirationDate.value - currentDate) /
						(product.maybeExpirationDate.value - product.creationDate),
				)
			}),
		),
	)
})
