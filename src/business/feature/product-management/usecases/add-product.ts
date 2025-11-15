import * as Clock from 'effect/Clock'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import * as Inspectable from 'effect/Inspectable'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string'

import * as Product from '../domain/entities/product.ts'
import * as AddProductOperation from '../queries/add-product'

export const ProductDTO = Schema.Struct({
	name: NonEmptyTrimmedString.Schema,
	maybeExpirationDate: Schema.Option(Integer.Schema),
})

export type ProductDTO = Schema.Schema.Type<typeof ProductDTO>

export type Message = Data.TaggedEnum<{
	AddProductSucceeeded: object
	AddProductFailed: object
}>

export const Message = Data.taggedEnum<Message>()

export class Service extends Effect.Service<Service>()(
	`feature/product-management/usecases/AddProduct`,
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const addProductResolver = yield* AddProductOperation.AddProduct

			return {
				run: Effect.fn(`AddProduct UC`)(function* (productData: ProductDTO) {
					yield* Effect.logInfo(
						`Requested to add product "${productData.name}"`,
					)

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

						return Message.AddProductFailed()
					}

					yield* Effect.logInfo(
						`Attempting to add product "${productData.name}"...`,
					)

					const result = yield* Effect.either(
						Effect.request(
							new AddProductOperation.Request({
								name: product.value.name,
								maybeExpirationDate: product.value.maybeExpirationDate,
								creationDate: product.value.creationDate,
							}),
							addProductResolver,
						),
					)

					if (Either.isLeft(result)) {
						return Message.AddProductFailed()
					}

					yield* Effect.logInfo(`Successfully added a product`)
					return Message.AddProductSucceeeded()
				}),
			}
		}),
	},
) {}
