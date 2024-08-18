/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'

import { Eff, O } from '@/core/imports'
import {
	assertExitIsFailure,
	assertExitIsSuccess,
} from '@/core/test-helpers'
import {
	isInteger,
	testRuntime,
} from '@/core/utils'

import {
	type ProductDTO,
	ProductsService,
	ProductsServiceError,
} from '../interfaces/read/get-sorted-products'
import {
	type ProductModel,
	useCase,
} from './get-sorted-products'

const numbers = [0, 3.5, NaN, Infinity, -Infinity]

const names = ['', 'name']

const record = fc.oneof(
	fc.record({
		isValid: fc.constant(
			true,
		) as fc.Arbitrary<true>,
		id: fc.constantFrom('1'),
		creationDate: fc.constantFrom(...numbers),
		expirationDate: fc
			.constantFrom(...numbers)
			.chain(a =>
				fc.constantFrom(O.some(a), O.none()),
			),
		name: fc.constantFrom(...names),
	}),
	fc.record({
		isValid: fc.constant(
			false,
		) as fc.Arbitrary<false>,
		id: fc.constantFrom(O.some('1'), O.none()),
		name: fc
			.constantFrom(...names)
			.chain(name =>
				fc.constantFrom(O.some(name), O.none()),
			),
	}),
)

const toModel = (
	product: ProductDTO,
): ProductModel => {
	if (!product.isValid) {
		return product
	}

	if (!isInteger(product.creationDate)) {
		return {
			isValid: false,
			name: O.some(product.name),
			id: O.some(product.id),
		}
	}

	if (
		O.isSome(product.expirationDate) &&
		!isInteger(product.expirationDate.value)
	) {
		return {
			isValid: false,
			name: O.some(product.name),
			id: O.some(product.id),
		}
	}

	if (product.name === '') {
		return {
			isValid: false,
			name: O.some(product.name),
			id: O.some(product.id),
		}
	}

	return product
}

describe('Get sorted products', () => {
	test.concurrent(
		'Should return an error',
		async () => {
			const sortedProducts = Eff.provideService(
				useCase,
				ProductsService,
				Eff.gen(function* () {
					return yield* Eff.fail(
						ProductsServiceError(''),
					)
				}),
			)

			const exit =
				await testRuntime.runPromiseExit(
					sortedProducts,
				)

			assertExitIsFailure(exit)
		},
	)

	test.concurrent.prop([record, record, record])(
		'Should return a list',
		async (a, b, c) => {
			const products = [a, b, c]
			const sortedProducts = Eff.provideService(
				useCase,
				ProductsService,
				Eff.gen(function* () {
					return yield* Eff.succeed({
						total: products.length,
						products,
					})
				}),
			)

			const exit =
				await testRuntime.runPromiseExit(
					sortedProducts,
				)

			assertExitIsSuccess(exit)

			expect(exit.value).toStrictEqual({
				total: products.length,
				models: products.map(toModel),
			})
		},
	)
})
