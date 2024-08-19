import { tryPromise } from '@/core/helper'
import { E, Eff, O } from '@/core/imports'
import { isInteger } from '@/core/utils'

import {
	type AddProductDTO,
	AddProductServiceError,
} from '@/app/interfaces/write/add-product'

import { CapacitorService } from '..'

export const command: (
	product: AddProductDTO,
) => Eff.Effect<
	void,
	AddProductServiceError,
	CapacitorService
> = product =>
	Eff.gen(function* () {
		if (!isInteger(product.creationDate)) {
			return yield* Eff.fail(
				AddProductServiceError(
					'Creation date must be an integer',
				),
			)
		}

		if (
			O.isSome(product.expirationDate) &&
			!isInteger(product.expirationDate.value)
		) {
			return yield* Eff.fail(
				AddProductServiceError(
					'Expiration date must be an integer',
				),
			)
		}

		const { db } = yield* CapacitorService

		const result = yield* tryPromise(() =>
			db.addProduct({
				product: {
					name: product.name,
					creationDate: product.creationDate,
					expirationDate: O.isSome(
						product.expirationDate,
					)
						? product.expirationDate.value
						: undefined,
				},
			}),
		).pipe(Eff.either)

		if (E.isLeft(result)) {
			yield* Eff.logError(result.left)
			return yield* Eff.fail(
				AddProductServiceError(
					'There was a problem with the request',
				),
			)
		}

		yield* Eff.log('No errors adding the product')
	})
