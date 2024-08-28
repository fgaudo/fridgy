import {
	B,
	E,
	Eff,
	Int,
	NNInt,
	O,
} from '@/core/imports.js'
import type { NonEmptyTrimmedString } from '@/core/non-empty-trimmed-string.js'

import * as P from '@/domain/product.js'

import { ProductsService } from '@/app/interfaces/read/get-sorted-products.js'

export type ProductModel =
	| {
			isValid: true
			id: string
			name: NonEmptyTrimmedString
			expirationDate: O.Option<Int.Integer>
			creationDate: Int.Integer
	  }
	| {
			isValid: false
			id: O.Option<string>
			name: O.Option<NonEmptyTrimmedString>
	  }

export type ProductList = Eff.Effect<
	{
		total: NNInt.NonNegativeInteger
		models: ProductModel[]
	},
	ProductListError,
	ProductsService
>

export type ProductListError = string &
	B.Brand<'ProductListError'>

const ProductListError =
	B.nominal<ProductListError>()

export const useCase: ProductList = Eff.gen(
	function* () {
		const getProductListWithTotal =
			yield* ProductsService

		const result =
			yield* getProductListWithTotal.pipe(
				Eff.either,
			)

		if (E.isLeft(result)) {
			yield* Eff.logError(result)
			return yield* Eff.fail(
				ProductListError(
					'There was a problem retrieving the list',
				),
			)
		}

		const { total, products: rawProducts } =
			result.right

		yield* Eff.log(
			`Received ${rawProducts.length.toString(10)} products out of ${total.toString(10)}`,
		)

		const models: ProductModel[] = yield* Eff.all(
			rawProducts.map(rawProduct =>
				Eff.gen(function* () {
					if (!rawProduct.isValid) {
						yield* Eff.logError(
							'Invalid raw product supplied',
						).pipe(
							Eff.annotateLogs({
								p: rawProduct,
							}),
						)
						return rawProduct
					}

					const product =
						P.createProduct(rawProduct)

					return {
						name: P.name(product),
						expirationDate:
							P.expirationDate(product),
						id: rawProduct.id,
						creationDate: rawProduct.creationDate,
						isValid: true,
					} as const
				}),
			),
		)

		return { models, total }
	},
)
