import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'
import * as Inspectable from 'effect/Inspectable'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as Integer from '../../../core/integer'
import * as NonEmptyTrimmedString from '../../../core/non-empty-trimmed-string'
import * as Product from '../../domain/product'
import { AddProduct as AddProductOperation } from '../operations'

export const ProductDTO = Schema.Struct({
	name: NonEmptyTrimmedString.Schema,
	maybeExpirationDate: Schema.Option(Integer.Schema),
})

export type ProductDTO = Schema.Schema.Type<typeof ProductDTO>

export class AddProduct extends Effect.Service<AddProduct>()(
	`app/useCases/AddProduct`,
	{
		effect: Effect.gen(function* () {
			const addProductResolver = yield* AddProductOperation.Resolver

			return Effect.fn(`AddProduct UC`)(function* (productData: ProductDTO) {
				yield* Effect.logInfo(`Requested to add product "${productData.name}"`)

				const timestamp = Integer.unsafeFromNumber(
					yield* Clock.currentTimeMillis,
				)

				const product = Product.fromStruct({
					name: productData.name,
					maybeExpirationDate: productData.maybeExpirationDate,
					creationDate: timestamp,
				})

				if (Option.isNone(product)) {
					yield* Effect.logError(`Attempted to add an invalid product.`).pipe(
						Effect.annotateLogs({
							product: Inspectable.format(productData),
						}),
					)

					return yield* Effect.fail(undefined)
				}

				yield* Effect.logInfo(
					`Attempting to add product "${productData.name}"...`,
				)

				yield* Effect.request(
					new AddProductOperation.Request({
						name: product.value.name,
						maybeExpirationDate: product.value.maybeExpirationDate,
						creationDate: product.value.creationDate,
					}),
					addProductResolver,
				)

				yield* Effect.logInfo(`Successfully added a product`)
			})
		}),
	},
) {}
