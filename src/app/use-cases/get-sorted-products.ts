import { B, E, Eff, O } from '@/core/imports'
import * as Int from '@/core/integer'
import type { NonEmptyTrimmedString } from '@/core/non-empty-trimmed-string'

import * as P from '@/domain/product'

import { ProductsService } from '../interfaces/read/get-sorted-products'

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
		total: Int.Integer
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
			`Received ${rawProducts.length.toString(10)} products out of ${Int.toNumber(total).toString(10)}`,
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
