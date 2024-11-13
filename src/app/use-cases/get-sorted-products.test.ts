import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'

import { E, Eff, NNInt } from '@/core/imports.ts'
import * as H from '@/core/test-helpers.ts'
import { testRuntime } from '@/core/utils.ts'

import {
	ProductsService,
	ProductsServiceError,
} from '@/app/interfaces/read/get-sorted-products.ts'

import { useCase } from './get-sorted-products.ts'

const record = fc.oneof(
	fc
		.record({
			id: H.string,
			creationDate: H.integer,
			expirationDate: H.maybeInteger,
			name: H.nonEmptyTrimmedString,
		})
		.map(_ => E.right(_)),
	fc
		.record({
			id: H.maybeString,
			name: H.maybeNonEmptyTrimmedString,
		})
		.map(_ => E.left(_)),
)

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
						total: NNInt.unsafe_fromNumber(
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

			expect(exit.value).toStrictEqual({
				total: NNInt.unsafe_fromNumber(
					products.length,
				),
				models: products,
			})
		},
	)
})
