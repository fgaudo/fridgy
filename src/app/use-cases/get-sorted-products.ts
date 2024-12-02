import {
	C,
	E,
	Eff,
	H,
	Int,
	L,
	NNInt,
	O,
} from '@/core/imports.ts'
import type { NonEmptyTrimmedString } from '@/core/non-empty-trimmed-string.ts'

import * as P from '@/domain/product.ts'

import { GetSortedProductsService } from '../interfaces/get-sorted-products.ts'

export class GetSortedProductsUseCase extends C.Tag(
	'GetSortedProductsUseCase',
)<
	GetSortedProductsUseCase,
	Eff.Effect<
		{
			models: ProductModel[]
			total: NNInt.NonNegativeInteger
		},
		void
	>
>() {}

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

export const useCase = L.effect(
	GetSortedProductsUseCase,
	Eff.gen(function* () {
		const getProductListWithTotal =
			yield* GetSortedProductsService

		return Eff.gen(function* () {
			const result =
				yield* getProductListWithTotal.pipe(
					Eff.either,
				)

			if (E.isLeft(result)) {
				yield* H.logError(result)
				return yield* Eff.fail(undefined)
			}

			const { total, products: rawProducts } =
				result.right

			yield* H.logInfo(
				`Received ${rawProducts.length.toString(10)} products out of ${total.toString(10)}`,
			)

			const models: ProductModel[] =
				yield* Eff.all(
					rawProducts.map(rawProduct =>
						Eff.gen(function* () {
							if (!rawProduct.isValid) {
								yield* H.logError(
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
								creationDate:
									rawProduct.creationDate,
								isValid: true,
							} as const
						}),
					),
				)

			return { models, total }
		})
	}),
)
