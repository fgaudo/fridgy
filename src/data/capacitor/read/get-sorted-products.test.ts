import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'

import {
	assertExitIsFailure,
	assertExitIsSuccess,
} from '@/core/helper'
import { Eff, O } from '@/core/imports'
import {
	isInteger,
	testRuntime,
} from '@/core/utils'

import type { ProductDTO } from '@/app/interfaces/read/get-sorted-products'

import { CapacitorService } from '..'
import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin'
import { query } from './get-sorted-products'

const numbers = [
	0,
	undefined,
	3.5,
	NaN,
	Infinity,
	-Infinity,
]

const strings = ['', 'name', undefined]

const record = fc.record({
	id: fc.constantFrom(...numbers),
	creationDate: fc.constantFrom(...numbers),
	expirationDate: fc.constantFrom(...numbers),
	name: fc.constantFrom(...strings),
})

function toModel(product: {
	id: number | undefined
	name: string | undefined
	creationDate: number | undefined
	expirationDate: number | undefined
}): ProductDTO {
	if (
		product.id === 0 &&
		(product.name === 'name' ||
			product.name === '') &&
		product.creationDate === 0 &&
		(product.expirationDate === undefined ||
			isInteger(product.expirationDate))
	) {
		return {
			isValid: true,
			id: product.id.toString(10),
			name: product.name,
			creationDate: product.creationDate,
			expirationDate: O.fromNullable(
				product.expirationDate,
			),
		}
	}

	return {
		isValid: false,
		name: O.fromNullable(product.name),
		id: O.fromNullable(product.id).pipe(
			O.map(id => id.toString(10)),
		),
	}
}

describe('Get products', () => {
	test.concurrent.prop([record, record, record])(
		'Should return a list',
		async (a, b, c) => {
			const products = [a, b, c]

			const addProduct = Eff.provideService(
				query,
				CapacitorService,
				{
					db: {
						getAllProductsWithTotal: () =>
							Promise.resolve({
								total: products.length,
								products,
							}),
					} as unknown as FridgySqlitePlugin,
				},
			)

			const exit =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			assertExitIsSuccess(exit)

			expect(exit.value).toStrictEqual({
				total: products.length,
				products: products.map(toModel),
			})
		},
	)

	test.concurrent(
		'Should return an error',
		async () => {
			const addProduct = Eff.provideService(
				query,
				CapacitorService,
				{
					db: {
						getAllProductsWithTotal: () =>
							Promise.resolve({}),
					} as unknown as FridgySqlitePlugin,
				},
			)

			const exit =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			assertExitIsFailure(exit)
		},
	)

	test.concurrent(
		'Should return an error',
		async () => {
			const addProduct = Eff.provideService(
				query,
				CapacitorService,
				{
					db: {
						getAllProductsWithTotal: () =>
							Promise.reject(new Error()),
					} as unknown as FridgySqlitePlugin,
				},
			)

			const exit =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			assertExitIsFailure(exit)
		},
	)
})
