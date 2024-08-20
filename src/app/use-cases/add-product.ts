import { Clock, Effect } from 'effect'

import { B, E, Eff, O } from '@/core/imports'

import * as P from '@/domain/product'

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

		const result1 = P.createProduct({
			name: product.name,
			expirationDate: product.expirationDate,
		})

		if (E.isLeft(result1)) {
			yield* Eff.logError(result1.left)
			return yield* Eff.fail(
				AddProductError('Bad product given'),
			)
		}

		const result2 = yield* addProduct({
			name: P.name(result1.right),
			expirationDate: P.expirationDate(
				result1.right,
			),
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
