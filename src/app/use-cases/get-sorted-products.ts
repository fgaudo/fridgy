import { B, E, Eff, O } from '@/core/imports'

import { createProduct } from '@/domain/product'

import { ProductsService } from '../interfaces/read/get-sorted-products'

export type ProductModel =
	| {
			isValid: true
			id: string
			name: string
			expirationDate: O.Option<number>
			creationDate: number
	  }
	| {
			isValid: false
			id: O.Option<string>
			name: O.Option<string>
	  }

export type ProductList = Eff.Effect<
	{
		total: number
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

					const result = createProduct(rawProduct)

					if (E.isLeft(result)) {
						yield* Eff.logError(
							'Raw product failed business validation rules',
						).pipe(
							Eff.annotateLogs({
								p: rawProduct,
							}),
						)
						return {
							id: O.some(rawProduct.id),
							name: O.some(rawProduct.name),
							isValid: false,
						} as const
					}

					const product = result.right

					return {
						name: product.name,
						expirationDate:
							product.expirationDate,
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
