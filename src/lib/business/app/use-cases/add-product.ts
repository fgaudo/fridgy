import { format } from 'effect/Inspectable'

import { Cl, Eff, Int, NETS, O, Sc } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

import { AddProduct as AddProductOperation } from '$lib/business/app/operations'
import * as P from '$lib/business/domain/product'

export const ProductDTO = Sc.Struct({
	name: NETS.NonEmptyTrimmedStringSchema,
	maybeExpirationDate: Sc.Option(Int.IntegerSchema),
})

export type ProductDTO = Sc.Schema.Type<typeof ProductDTO>

export class AddProduct extends Eff.Service<AddProduct>()(
	`app/useCases/AddProduct`,
	{
		effect: Eff.gen(function* () {
			const addProductResolver = yield* AddProductOperation.Resolver

			return (productData: ProductDTO) =>
				Eff.gen(function* () {
					yield* Eff.logInfo(`Requested to add product "${productData.name}"`)

					const timestamp = Int.unsafeFromNumber(yield* Cl.currentTimeMillis)

					const product = P.fromStruct({
						name: productData.name,
						maybeExpirationDate: productData.maybeExpirationDate,
						creationDate: timestamp,
					})

					if (O.isNone(product)) {
						yield* Eff.logError(`Attempted to add an invalid product.`).pipe(
							Eff.annotateLogs({
								product: format(productData),
							}),
						)

						return yield* Eff.fail(undefined)
					}

					yield* Eff.logInfo(
						`Attempting to add product "${productData.name}"...`,
					)

					yield* Eff.request(
						new AddProductOperation.Request({
							name: product.value.name,
							maybeExpirationDate: product.value.maybeExpirationDate,
							creationDate: product.value.creationDate,
						}),
						addProductResolver,
					)

					yield* Eff.logInfo(`Successfully added a product`)
				}).pipe(withLayerLogging(`A`))
		}),
	},
) {}
