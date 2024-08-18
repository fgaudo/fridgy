import { fc, test } from '@fast-check/vitest'
import { Exit } from 'effect'
import { assert, describe, expect } from 'vitest'

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

function toModel(r: {
	id: number | undefined
	name: string | undefined
	creationDate: number | undefined
	expirationDate: number | undefined
}): ProductDTO {
	if (
		r.id === 0 &&
		(r.name === 'name' || r.name === '') &&
		r.creationDate === 0 &&
		(r.expirationDate === undefined ||
			isInteger(r.expirationDate))
	) {
		return {
			isValid: true,
			id: r.id.toString(10),
			name: r.name,
			creationDate: r.creationDate,
			expirationDate: O.fromNullable(
				r.expirationDate,
			),
		}
	}

	return {
		isValid: false,
		name: O.fromNullable(r.name),
		id: O.fromNullable(r.id).pipe(
			O.filter(isInteger),
			O.map(id => id.toString(10)),
		),
	}
}

describe('Get products', () => {
	test.concurrent.prop([record, record, record])(
		'Should just work',
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

			const data =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			assert(
				Exit.isSuccess(data),
				'Result is not a success',
			)

			expect(data.value).toStrictEqual({
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

			const data =
				await testRuntime.runPromiseExit(
					addProduct,
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

			const data =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			assert(
				Exit.isFailure(data),
				'Result is not an error',
			)
		},
	)
})
