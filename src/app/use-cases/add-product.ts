import { Clock, Effect } from 'effect'

import { B, E, Eff, O } from '@/core/imports'

import { AddProductService } from '../interfaces/write/add-product'

export interface AddProductDTO {
	name: string
	expirationDate: O.Option<number>
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

export const useCase: AddProduct = product =>
	Eff.gen(function* () {
		const addProduct = yield* AddProductService

		const timestamp =
			yield* Clock.currentTimeMillis

		yield* Effect.logDebug(
			'About to add product',
		).pipe(
			Effect.annotateLogs('product', product),
		)

		const result = yield* addProduct({
			...product,
			creationDate: timestamp,
		}).pipe(Eff.either)

		if (E.isLeft(result)) {
			yield* Eff.logError(result.left)
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
