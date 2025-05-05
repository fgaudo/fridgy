import { Fiber, LogLevel } from 'effect'
import { format } from 'effect/Inspectable'

import {
	Cl,
	Eff,
	Int,
	NETS,
	O,
} from '$lib/core/imports.ts'

import {
	AddProduct as AddProductOperation,
	LogWithLevel,
} from '$lib/business/app/operations'
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
			const logResolver =
				yield* LogWithLevel.Resolver

			return (productData: ProductDTO) =>
				Eff.gen(function* () {
					yield* Eff.request(
						LogWithLevel.Request({
							level: LogLevel.Info,
							message: [
								'AddProduct use case started',
							],
							annotations: {
								product: format(productData),
							},
						}),
						logResolver,
					)

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
						yield* Eff.request(
							LogWithLevel.Request({
								level: LogLevel.Error,
								message: [
									'The provided product is invalid',
								],
								annotations: {
									product: format(productData),
								},
							}),
							logResolver,
						)

						return yield* Eff.fail(
							'Product is not valid',
						)
					}

					const addProductFiber = yield* Eff.fork(
						Eff.request(
							AddProductOperation.Request({
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
							}),
							addProductResolver,
						),
					)

					yield* Eff.request(
						LogWithLevel.Request({
							level: LogLevel.Info,
							message: ['Adding product started'],
							annotations: {
								product: format(productData),
							},
						}),
						logResolver,
					)

					yield* Fiber.join(addProductFiber)

					yield* Eff.request(
						LogWithLevel.Request({
							level: LogLevel.Info,
							message: ['Product saved'],
							annotations: {
								product: productData,
							},
						}),
						logResolver,
					)
				})
		}),
	},
) {}
