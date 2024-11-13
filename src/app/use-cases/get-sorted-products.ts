import {
	B,
	E,
	Eff,
	Int,
	NNInt,
	O,
} from '@/core/imports.ts'
import type { NonEmptyTrimmedString } from '@/core/non-empty-trimmed-string.ts'

import * as P from '@/domain/product.ts'

import { ProductsService } from '@/app/interfaces/read/get-sorted-products.ts'

export type ProductModel = E.Either<
	{
		id: string
		name: NonEmptyTrimmedString
		expirationDate: O.Option<Int.Integer>
		creationDate: Int.Integer
	},
	{
		id: O.Option<string>
		name: O.Option<NonEmptyTrimmedString>
	}
>

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

		const result = yield* Eff.either(
			getProductListWithTotal,
		)

		if (E.isLeft(result)) {
			yield* Eff.logError(result.left)
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
					if (E.isLeft(rawProduct)) {
						yield* Eff.logError(
							'Invalid raw product supplied',
						).pipe(
							Eff.annotateLogs({
								p: rawProduct,
							}),
						)
						return rawProduct
					}

					const product = P.createProduct(
						rawProduct.right,
					)

					return E.right({
						name: P.name(product),
						expirationDate:
							P.expirationDate(product),
						id: rawProduct.right.id,
						creationDate:
							rawProduct.right.creationDate,
					} as const)
				}),
			),
		)

		return { models, total }
	},
)
