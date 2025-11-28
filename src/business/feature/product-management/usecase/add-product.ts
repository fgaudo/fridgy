import * as Clock from 'effect/Clock'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Inspectable from 'effect/Inspectable'
import * as Option from 'effect/Option'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string'

import * as Product from '../domain/product.ts'
import * as ProductRepository from '../repository/product-repository.ts'

/////
/////

type AddProductParams = {
	name: NonEmptyTrimmedString.NonEmptyTrimmedString
	maybeExpirationDate: Option.Option<Integer.Integer>
}

/////
/////

export type Response = Data.TaggedEnum<{
	Succeeded: object
	Failed: object
}>

const Response = Data.taggedEnum<Response>()

/////
/////

export class AddProduct extends Effect.Service<AddProduct>()(
	`feature/product-management/usecase/add-product`,
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const { addProductResolver } = yield* ProductRepository.ProductRepository

			const { makeProduct } = yield* Product.ProductService

			return {
				run: Effect.fn(`AddProduct UC`)(function* (
					productData: AddProductParams,
				): Effect.fn.Return<Response> {
					yield* Effect.logInfo(
						`Requested to add product "${productData.name}"`,
					)

					const timestamp = Integer.unsafeFromNumber(
						yield* Clock.currentTimeMillis,
					)

					const product = makeProduct({
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

						return Response.Failed()
					}

					yield* Effect.logInfo(
						`Attempting to add product "${productData.name}"...`,
					)

					const result = yield* Effect.request(
						ProductRepository.AddProduct.Request({
							name: product.value.name,
							maybeExpirationDate: product.value.maybeExpirationDate,
							creationDate: product.value.creationDate,
						}),
						addProductResolver,
					)

					if (!result) {
						return Response.Failed()
					}

					yield* Effect.logInfo(`Successfully added a product`)
					return Response.Succeeded()
				}),
			}
		}),
		dependencies: [Product.ProductService.Default],
	},
) {}
