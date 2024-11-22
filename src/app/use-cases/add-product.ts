import {
	C,
	Cl,
	E,
	Eff,
	H,
	Int,
	L,
	NETS,
	O,
} from '@/core/imports.ts'

import * as P from '@/domain/product.ts'

import { AddProductService } from '@/app/interfaces/add-product.ts'

export class AddProductUseCase extends C.Tag(
	'AddProductUseCase',
)<
	AddProductUseCase,
	(product: ProductDTO) => Eff.Effect<void, void>
>() {}

export interface ProductDTO {
	name: NETS.NonEmptyTrimmedString
	expirationDate: O.Option<Int.Integer>
}

export const useCase = L.effect(
	AddProductUseCase,
	Eff.gen(function* () {
		const addProduct = yield* AddProductService

		return productData =>
			Eff.gen(function* () {
				const product =
					P.createProduct(productData)

				const timestamp = Int.unsafe_fromNumber(
					yield* Cl.currentTimeMillis,
				)

				yield* H.logInfo('Adding product').pipe(
					Eff.annotateLogs(
						'product',
						productData,
					),
				)

				const result2 = yield* addProduct({
					name: P.name(product),
					expirationDate:
						P.expirationDate(product),
					creationDate: timestamp,
				}).pipe(Eff.either)

				if (E.isLeft(result2)) {
					yield* H.logError(result2.left)

					return yield* Eff.fail(undefined)
				}

				yield* H.logInfo(
					'Product added succesfully',
				).pipe(
					Eff.annotateLogs(
						'product',
						productData,
					),
				)
			})
	}),
)
