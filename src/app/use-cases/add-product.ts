import { Clock, Effect } from 'effect'
import * as Eff from 'effect/Effect'
import * as OPT from 'effect/Option'

import { AddProductService } from '../interfaces/write/add-product'

export interface AddProductDTO {
	name: string
	expirationDate: OPT.Option<number>
}

export type AddProduct = (
	product: AddProductDTO,
) => Eff.Effect<void, string, AddProductService>

export const program: AddProduct = product =>
	Eff.gen(function* () {
		const addProduct = yield* AddProductService
		const timestamp =
			yield* Clock.currentTimeMillis

		yield* Effect.logDebug(
			'About to add product',
		).pipe(
			Effect.annotateLogs('product', product),
		)

		yield* addProduct({
			...product,
			creationDate: timestamp,
		})

		yield* Effect.logDebug(
			'No errors adding product',
		)
	})
