import { Fiber } from 'effect'
import { format } from 'effect/Inspectable'

import {
	Cl,
	Eff,
	Int,
	NETS,
	O,
} from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

import { AddProduct as AddProductOperation } from '$lib/business/app/operations'
import * as P from '$lib/business/domain/product'

export interface ProductDTO {
	name: NETS.NonEmptyTrimmedString
	maybeExpirationDate: O.Option<Int.Integer>
}

export class AddProduct extends Eff.Service<AddProduct>()(
	'app/useCases/AddProduct',
	{
		effect: Eff.gen(function* () {
			const addProductResolver =
				yield* AddProductOperation.Resolver

			return (productData: ProductDTO) =>
				Eff.gen(function* () {
					yield* Eff.logInfo(
						'User requested to add a product',
					)

					const timestamp = Int.unsafeFromNumber(
						yield* Cl.currentTimeMillis,
					)

					const product = P.createProduct({
						name: productData.name,
						maybeExpirationDate:
							productData.maybeExpirationDate,
						creationDate: timestamp,
					})

					if (O.isNone(product)) {
						yield* Eff.logError(
							'Attempted to add an invalid product.',
						).pipe(
							Eff.annotateLogs({
								product: format(productData),
							}),
						)

						return yield* Eff.fail(
							'Product is not valid',
						)
					}

					const addProductFiber = yield* Eff.fork(
						Eff.request(
							AddProductOperation.Request({
								name: P.name(product.value),
								maybeExpirationDate:
									P.maybeExpirationDate(
										product.value,
									),
								creationDate: P.creationDate(
									product.value,
								),
							}),
							addProductResolver,
						),
					)

					yield* Eff.logInfo(
						'Attempting to add product...',
					)

					yield* Fiber.join(addProductFiber)

					yield* Eff.logInfo(
						'User added a product',
					)
				}).pipe(withLayerLogging('A'))
		}),
	},
) {}
