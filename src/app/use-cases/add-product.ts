import { Clock, Effect } from 'effect'

import { B, E, Eff, O } from '@/core/imports'
import * as Int from '@/core/integer'
import type { NonEmptyTrimmedString } from '@/core/non-empty-trimmed-string'

import * as P from '@/domain/product'

import { AddProductService } from '../interfaces/write/add-product'

export interface AddProductDTO {
	name: NonEmptyTrimmedString
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

		const resultTimestamp = Int.fromNumber(
			yield* Clock.currentTimeMillis,
		)

		if (E.isLeft(resultTimestamp)) {
			yield* Eff.logError(resultTimestamp.left)
			return yield* Eff.fail(
				AddProductError(
					'Unexpected error occurred',
				),
			)
		}

		const timestamp = resultTimestamp.right

		const addProduct = yield* AddProductService

		yield* Effect.logDebug(
			'About to add product',
		).pipe(
			Effect.annotateLogs('product', productData),
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

		yield* Effect.logDebug(
			'No errors adding product',
		)
	})
