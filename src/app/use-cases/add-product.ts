import {
	B,
	Cl,
	E,
	Eff,
	Int,
	NETS,
	O,
} from '@/core/imports'

import * as P from '@/domain/product'

import { AddProductService } from '@/app/interfaces/write/add-product'

export interface AddProductDTO {
	name: NETS.NonEmptyTrimmedString
	expirationDate: O.Option<Int.Integer>
}

export type AddProduct = (
	product: AddProductDTO,
) => Eff.Effect<
	void,
	AddProductError,
	AddProductService
>

export type AddProductError = string &
	B.Brand<'AddProductError'>

const AddProductError =
	B.nominal<AddProductError>()

export const useCase: AddProduct = productData =>
	Eff.gen(function* () {
		const product = P.createProduct(productData)

		const timestamp = Int.unsafe_fromNumber(
			yield* Cl.currentTimeMillis,
		)

		const addProduct = yield* AddProductService

		yield* Eff.logDebug(
			'About to add product',
		).pipe(
			Eff.annotateLogs('product', productData),
		)

		const result2 = yield* addProduct({
			name: P.name(product),
			expirationDate: P.expirationDate(product),
			creationDate: timestamp,
		}).pipe(Eff.either)

		if (E.isLeft(result2)) {
			yield* Eff.logError(result2.left)
			return yield* Eff.fail(
				AddProductError(
					'There was a problem adding the product',
				),
			)
		}

		yield* Eff.logDebug(
			'No errors adding product',
		)
	})
