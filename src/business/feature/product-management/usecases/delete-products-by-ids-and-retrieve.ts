import assert from 'assert'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Schema from 'effect/Schema'

import * as NonEmptyHashSet from '@/core/non-empty-hash-set'

import * as ProductManager from '../interfaces/product-manager.ts'
import * as GetSortedProducts from './get-sorted-products.ts'

/////
/////

export class DeleteParameters extends Schema.Class<DeleteParameters>(
	'DeleteParameters',
)({
	ids: NonEmptyHashSet.Schema(Schema.String),
}) {}

/////
/////

class Failed extends Schema.TaggedClass<Failed>()('Failed', {}) {}

class DeleteSucceededButRefreshFailed extends Schema.TaggedClass<DeleteSucceededButRefreshFailed>()(
	'DeleteSucceededButRefreshFailed',
	{},
) {}

class Succeeded extends Schema.TaggedClass<Succeeded>()('Succeeded', {
	result: GetSortedProducts.Response.Succeeded.fields.result,
}) {}

export const Response = {
	Failed,
	DeleteSucceededButRefreshFailed,
	Succeeded,
}

export type Response = Failed | DeleteSucceededButRefreshFailed | Succeeded

/////
/////

export class Service extends Effect.Service<Service>()(
	`feature/product-management/usecases/delete-products-by-ids-and-retrieve`,
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const resolver = (yield* ProductManager.Service).deleteProductById
				.resolver

			const deleteProductById = (id: string) =>
				Effect.request(
					new ProductManager.DeleteProductById.Request({
						id,
					}),
					resolver,
				)

			const getAllProductsWithTotal = yield* GetSortedProducts.Service

			return {
				run: Effect.fn(`DeleteProductsByIds UC`)(function* ({
					ids,
				}: DeleteParameters) {
					yield* Effect.logInfo(`Requested to delete products`)
					yield* Effect.logInfo(`Attempting to delete products...`)

					const result = yield* Effect.forEach(ids, deleteProductById, {
						batching: true,
					})

					const number = Arr.reduce(result, 0, (acc, value) =>
						value ? acc + 1 : acc,
					)

					assert(number <= result.length)
					assert(number >= 0)

					if (number <= 0) {
						return new Response.Failed()
					}

					if (number < result.length) {
						yield* Effect.logWarning(
							`${(result.length - number).toString()} Products could not be deleted`,
						)
					}

					yield* Effect.logInfo(`${number.toString()} Products deleted`)

					const result2 = yield* getAllProductsWithTotal.run

					return Match.valueTags(result2, {
						Failed: () => new Response.DeleteSucceededButRefreshFailed(),
						Succeeded: ({ result }) => new Response.Succeeded({ result }),
					})
				}),
			}
		}),

		dependencies: [GetSortedProducts.Service.Default],
	},
) {}
