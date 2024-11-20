import {
	B,
	Cl,
	E,
	Eff,
	H,
	Int,
	NETS,
	O,
} from '@/core/imports.ts'

import * as P from '@/domain/product.ts'

import { AddProductService } from '@/app/interfaces/write/add-product.ts'

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

		yield* H.logInfo('Adding product').pipe(
			Eff.annotateLogs('product', productData),
			Eff.forkDaemon,
		)

		const result2 = yield* addProduct({
			name: P.name(product),
			expirationDate: P.expirationDate(product),
			creationDate: timestamp,
		}).pipe(Eff.either)

		if (E.isLeft(result2)) {
			yield* H.logError(result2.left).pipe(
				Eff.forkDaemon,
			)

			return yield* Eff.fail(
				AddProductError(
					'There was a problem adding the product',
				),
			)
		}

		yield* H.logInfo(
			'Product added succesfully',
		).pipe(
			Eff.annotateLogs('product', productData),
			Eff.forkDaemon,
		)
	})
