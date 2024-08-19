import { pipe } from 'effect'

import {
	fallback,
	tryPromise,
} from '@/core/helper'
import { E, Eff, O, Sc } from '@/core/imports'
import { isInteger } from '@/core/utils'

import {
	type ProductDTO,
	ProductsServiceError,
} from '@/app/interfaces/read/get-sorted-products'

import { CapacitorService } from '..'

const ProductsListSchema = Sc.Struct({
	total: Sc.Number,
	products: Sc.Array(
		Sc.Struct({
			id: Sc.optional(
				Sc.UndefinedOr(Sc.Number).annotations({
					decodingFallback: fallback(undefined),
				}),
			),
			name: Sc.optional(
				Sc.UndefinedOr(Sc.String).annotations({
					decodingFallback: fallback(undefined),
				}),
			),
			expirationDate: Sc.optional(
				Sc.UndefinedOr(Sc.Number).annotations({
					decodingFallback: fallback(undefined),
				}),
			),
			creationDate: Sc.optional(
				Sc.UndefinedOr(Sc.Number).annotations({
					decodingFallback: fallback(undefined),
				}),
			),
		}).annotations({
			decodingFallback: fallback({}),
		}),
	),
})

export const query: Eff.Effect<
	{
		total: number
		products: ProductDTO[]
	},
	ProductsServiceError,
	CapacitorService
> = Eff.gen(function* () {
	const { db } = yield* CapacitorService

	const result = yield* pipe(
		tryPromise(() =>
			db.getAllProductsWithTotal(),
		),
		Eff.either,
	)

	if (E.isLeft(result)) {
		yield* Eff.logError(result.left.toString())
		return yield* Eff.fail(
			ProductsServiceError(
				'There was an error while getting the data',
			),
		)
	}

	const decodeResult = yield* Sc.decodeUnknown(
		ProductsListSchema,
	)(result.right).pipe(Eff.either)

	if (E.isLeft(decodeResult)) {
		yield* Eff.logError(
			decodeResult.left.toString(),
		)

		return yield* Eff.fail(
			ProductsServiceError(
				'There was an error while decoding the data',
			),
		)
	}

	const products = yield* Eff.all(
		decodeResult.right.products.map(product =>
			Eff.gen(function* () {
				const {
					id,
					name,
					creationDate,
					expirationDate,
				} = product

				if (
					isInteger(id) &&
					isInteger(creationDate) &&
					(expirationDate === undefined ||
						isInteger(expirationDate)) &&
					name !== undefined
				) {
					return {
						isValid: true,
						id: id.toString(10),
						name,
						creationDate,
						expirationDate: O.fromNullable(
							product.expirationDate,
						),
					} as const
				}

				yield* Eff.logError(
					'Product is corrupt',
				).pipe(Eff.annotateLogs({ product }))

				return {
					isValid: false,
					id: pipe(
						O.fromNullable(id),
						O.map(id => id.toString(10)),
					),
					name: O.fromNullable(product.name),
				} as const
			}),
		),
	)

	return {
		total: decodeResult.right.total,
		products,
	}
})
