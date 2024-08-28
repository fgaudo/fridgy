import { tryPromise } from '@/core/helper'
import { E, Eff, O } from '@/core/imports'

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
