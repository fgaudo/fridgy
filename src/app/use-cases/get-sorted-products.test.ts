/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'

import { Eff, L, NNInt } from '@/core/imports.ts'
import * as H from '@/core/test-helpers.ts'
import { testRuntime } from '@/core/utils.ts'

import { GetSortedProductsService } from '@/app/interfaces/get-sorted-products.ts'

import {
	GetSortedProductsUseCase,
	useCase,
} from './get-sorted-products.ts'

const record = fc.oneof(
	fc.record(
		{
			isValid: fc.constant(
				true,
			) as fc.Arbitrary<true>,
			id: H.string,
			creationDate: H.integer,
			expirationDate: H.maybeInteger,
			name: H.nonEmptyTrimmedString,
		},
		{ noNullPrototype: true },
	),
	fc.record(
		{
			isValid: fc.constant(
				false,
			) as fc.Arbitrary<false>,
			id: H.maybeString,
			name: H.maybeNonEmptyTrimmedString,
		},
		{ noNullPrototype: true },
	),
)

const mockMain = Eff.gen(function* () {
	return yield* yield* GetSortedProductsUseCase
})

describe('Get sorted products', () => {
	test.concurrent(
		'Should return an error',
		async () => {
			const sortedProducts = Eff.provide(
				mockMain,
				L.provide(
					useCase,
					L.succeed(
						GetSortedProductsService,
						Eff.gen(function* () {
							return yield* Eff.fail(undefined)
						}),
					),
				),
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
			const sortedProducts = Eff.provide(
				mockMain,
				useCase.pipe(
					L.provide(
						L.succeed(
							GetSortedProductsService,
							Eff.gen(function* () {
								return yield* Eff.succeed({
									total: NNInt.unsafe_fromNumber(
										products.length,
									),
									products,
								})
							}),
						),
					),
				),
			)

			const exit =
				await testRuntime.runPromiseExit(
					sortedProducts,
				)
			H.assertExitIsSuccess(exit)

			expect(exit.value).toStrictEqual({
				total: NNInt.unsafe_fromNumber(
					products.length,
				),
				models: products,
			})
		},
	)
})
