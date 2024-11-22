import {
	E,
	Eff,
	H,
	L,
	O,
} from '@/core/imports.ts'

import { AddProductService } from '@/app/interfaces/add-product.ts'

import { CapacitorService } from '../index.ts'

export const command = L.effect(
	AddProductService,

	Eff.gen(function* () {
		const { db } = yield* CapacitorService

		return product =>
			Eff.gen(function* () {
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
					return yield* Eff.fail(undefined)
				}

				yield* H.logDebug(
					'No errors adding the product',
				)
			})
	}),
)
