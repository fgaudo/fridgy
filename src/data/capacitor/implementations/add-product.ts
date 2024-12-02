import { Eff, H, L, O } from '@/core/imports.ts'

import { AddProductService } from '@/app/interfaces/add-product.ts'

import { CapacitorService } from '../index.ts'

export const command = L.effect(
	AddProductService,

	Eff.gen(function* () {
		const { db } = yield* CapacitorService

		return product =>
			Eff.gen(function* () {
				yield* H.tryPromise(() =>
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
				)

				yield* H.logDebug(
					'No errors adding the product',
				)
			})
	}),
)
