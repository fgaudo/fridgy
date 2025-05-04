import { Data, LogLevel } from 'effect'
import { format } from 'effect/Inspectable'

import {
	Cl,
	Eff,
	Int,
	NETS,
	O,
} from '$lib/core/imports.ts'

import {
	AddProduct as AddProductQuery,
	LogWithLevel,
} from '$lib/business/app/queries'
import * as P from '$lib/business/domain/product'

export interface ProductDTO {
	name: NETS.NonEmptyTrimmedString
	maybeExpirationDate: O.Option<Int.Integer>
}

export class AddProduct extends Eff.Service<AddProduct>()(
	'app/AddProduct',
	{
		effect: Eff.gen(function* () {
			const addProduct =
				yield* AddProductQuery.AddProduct
			const log = yield* LogWithLevel.LogWithLevel

			return (productData: ProductDTO) =>
				Eff.gen(function* () {
					const timestamp = Int.unsafe_fromNumber(
						yield* Cl.currentTimeMillis,
					)

					const product = P.createProduct({
						name: productData.name,
						maybeExpirationDate:
							productData.maybeExpirationDate,
						creationDate: timestamp,
					})

					if (O.isNone(product)) {
						return yield* Eff.fail(
							'Product is not valid',
						)
					}

					yield* log(
						LogLevel.Info,
						'Product save attempt',
					).pipe(
						Eff.annotateLogs(
							'product',
							format(Data.struct(productData)),
						),
					)

					yield* addProduct({
						maybeName: O.some(
							P.name(product.value),
						),
						maybeExpirationDate:
							P.maybeExpirationDate(
								product.value,
							),
						maybeCreationDate: O.some(
							P.creationDate(product.value),
						),
					})

					yield* log(
						LogLevel.Info,
						'Product saved',
					).pipe(
						Eff.annotateLogs(
							'product',
							productData,
						),
					)
				})
		}),
	},
) {}
