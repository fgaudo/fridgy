/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'

import { Eff, Int, O } from '@/core/imports'
import * as H from '@/core/test-helpers'
import { testRuntime } from '@/core/utils'

import {
	type ProductDTO,
	ProductsService,
	ProductsServiceError,
} from '../interfaces/read/get-sorted-products'
import {
	type ProductModel,
	useCase,
} from './get-sorted-products'

const record = fc.oneof(
	fc.record({
		isValid: fc.constant(
			true,
		) as fc.Arbitrary<true>,
		id: H.string,
		creationDate: H.integer,
		expirationDate: H.maybeInteger,
		name: H.string,
	}),
	fc.record({
		isValid: fc.constant(
			false,
		) as fc.Arbitrary<false>,
		id: H.maybeString,
		name: H.maybeString,
	}),
)

const toModel = (
	product: ProductDTO,
): ProductModel => {
	if (!product.isValid) {
		return product
	}

	if (product.name.trim().length <= 0) {
		return {
			isValid: false,
			name: O.some(product.name),
			id: O.some(product.id),
		}
	}

	return {
		...product,
		name: product.name.trim(),
	}
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

			H.assertExitIsFailure(exit)
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
						total: Int.unsafe_fromNumber(
							products.length,
						),
						products,
					})
				}),
			)

			const exit =
				await testRuntime.runPromiseExit(
					sortedProducts,
				)

			H.assertExitIsSuccess(exit)
			console.log(exit.value.models)
			console.log(products.map(toModel))

			expect(exit.value).toStrictEqual({
				total: Int.unsafe_fromNumber(
					products.length,
				),
				models: products.map(toModel),
			})
		},
	)
})
