import { E, Eff, H, O } from '@/core/imports.ts'

import { AddProductServiceError } from '@/app/interfaces/write/add-product.ts'
import type { AddProductDTO } from '@/app/interfaces/write/add-product.ts'

import { CapacitorService } from '../index.ts'

export const command: (
	product: AddProductDTO,
) => Eff.Effect<
	void,
	AddProductServiceError,
	CapacitorService
> = product =>
	Eff.gen(function* () {
		const { db } = yield* CapacitorService

		const result = yield* H.tryPromise(() =>
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
			yield* H.logError(result.left)
			return yield* Eff.fail(
				AddProductServiceError(
					'There was a problem with the request',
				),
			)
		}

		yield* H.logDebug(
			'No errors adding the product',
		)
	})
