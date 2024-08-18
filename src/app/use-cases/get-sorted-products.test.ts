import { Exit } from 'effect'
import {
	assert,
	describe,
	expect,
	test,
} from 'vitest'

import { Eff, O } from '@/core/imports'

import {
	type ProductDTO,
	ProductsService,
	ProductsServiceError,
} from '../interfaces/read/get-sorted-products'
import { useCase } from './get-sorted-products'

export function expectToBeDefined<T>(
	value: T | undefined,
): asserts value is T {
	expect(value).toBeDefined()
}

describe('getSortedProducts', () => {
	test.concurrent(
		'Should return empty list and 0 total',
		async () => {
			const sortedProducts = Eff.provideService(
				useCase,
				ProductsService,
				Eff.gen(function* () {
					return yield* Eff.succeed({
						total: 0,
						products: [],
					})
				}),
			)

			const data = await Eff.runPromiseExit(
				sortedProducts,
			)

			assert(
				Exit.isSuccess(data),
				'Result is not a success',
			)

			expect(data.value).toStrictEqual({
				total: 1,
				models: [],
			})
		},
	)

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

			const data = await Eff.runPromiseExit(
				sortedProducts,
			)

			assert(
				Exit.isFailure(data),
				'Result is not an error',
			)
		},
	)

	test.concurrent(
		'Should return an error',
		async () => {
			const sortedProducts = Eff.provideService(
				useCase,
				ProductsService,
				Eff.gen(function* () {
					return yield* Eff.succeed({
						total: 3,
						products: [
							{
								isValid: true,
								name: 'name',
								id: 'id1',
								expirationDate: O.some(0),
								creationDate: 0,
							},
							{
								isValid: true,
								name: '',
								id: 'id2',
								expirationDate: O.some(0),
								creationDate: 0,
							},
							{
								isValid: false,
								name: O.some('name3'),
								id: O.some('id3'),
							},
						] satisfies ProductDTO[],
					} as const)
				}),
			)

			const data = await Eff.runPromiseExit(
				sortedProducts,
			)

			assert(
				Exit.isSuccess(data),
				'Result is not a success',
			)

			expect(data.value).toStrictEqual({
				total: 3,
				models: [
					{
						isValid: true,
						name: 'name',
						id: 'id1',
						expirationDate: O.some(0),
						creationDate: 0,
					},
					{
						isValid: false,
						name: O.some(''),
						id: O.some('id2'),
					},
					{
						isValid: false,
						name: O.some('name3'),
						id: O.some('id3'),
					},
				],
			})
		},
	)
})
