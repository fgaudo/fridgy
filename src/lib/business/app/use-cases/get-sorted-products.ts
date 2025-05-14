import { A, E, Eff, Int, NNInt, O, pipe } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'
import type { NonEmptyTrimmedString } from '$lib/core/non-empty-trimmed-string.ts'

import { GetSortedProducts as GetSortedProductsOperation } from '$lib/business/app/operations'
import * as P from '$lib/business/domain/product'

export type Product =
	| {
			isCorrupt: false
			id: string
			maybeName: O.Option<NonEmptyTrimmedString>
			maybeExpirationDate: O.Option<Int.Integer>
			maybeCreationDate: O.Option<Int.Integer>
			isValid: false
	  }
	| {
			isCorrupt: false
			id: string
			name: NonEmptyTrimmedString
			maybeExpirationDate: O.Option<Int.Integer>
			creationDate: Int.Integer
			isValid: true
	  }
	| {
			isCorrupt: true
			maybeName: O.Option<NonEmptyTrimmedString>
	  }

export type ProductsPage = {
	entries: Product[]
	total: NNInt.NonNegativeInteger
}

export class GetSortedProducts extends Eff.Service<GetSortedProducts>()(
	`app/useCases/GetSortedProducts`,
	{
		effect: Eff.gen(function* () {
			const getSortedProducts = Eff.request(
				GetSortedProductsOperation.Request({}),
				yield* GetSortedProductsOperation.Resolver,
			)

			return Eff.gen(function* () {
				yield* Eff.log(`Requested to fetch the list of products`)

				yield* Eff.log(`Attempting to fetch the list of products...`)

				const errorOrData = yield* pipe(getSortedProducts, Eff.either)

				if (
					E.isLeft(errorOrData) &&
					errorOrData.left._tag === `FetchingFailed`
				) {
					yield* Eff.logError(`Could not receive items.`)

					return yield* Eff.fail(undefined)
				}

				if (E.isLeft(errorOrData)) {
					yield* Eff.logError(`Received invalid data.`)

					return yield* Eff.fail(undefined)
				}

				const result = errorOrData.right

				const total = yield* Eff.gen(function* () {
					if (result.total < result.products.length) {
						yield* Eff.logWarning(
							`Received ${result.products.length.toString(10)} products, but they exceed the reported total (${result.total.toString(10)}).`,
						)

						return NNInt.unsafeFromNumber(result.products.length)
					}

					yield* Eff.logInfo(
						`Received ${result.products.length.toString(10)} products out of ${result.total.toString(10)}`,
					)

					return result.total
				})

				const entries = yield* pipe(
					result.products,
					A.map(toProductResultWithEffect),
					Eff.all,
				)

				return {
					entries,
					total,
				}
			}).pipe(withLayerLogging(`A`)) satisfies Eff.Effect<ProductsPage, void>
		}),
	},
) {}

function toProductResultWithEffect({
	maybeId,
	maybeName,
	maybeCreationDate,
	maybeExpirationDate,
}: GetSortedProductsOperation.ProductDTO): Eff.Effect<Product> {
	return Eff.gen(function* () {
		if (O.isNone(maybeId)) {
			yield* Eff.logWarning(`CORRUPTION - Product has no id.`)

			return {
				id: Symbol(),
				isCorrupt: true,
				maybeName,
			}
		}

		const maybeProduct = O.gen(function* () {
			const { name, creationDate } = yield* O.all({
				name: maybeName,
				creationDate: maybeCreationDate,
			})

			return yield* P.createProduct({
				name,
				creationDate,
				maybeExpirationDate,
			})
		})

		if (O.isNone(maybeProduct)) {
			yield* Eff.logWarning(`Product is invalid.`)

			return {
				id: maybeId.value,
				maybeName,
				maybeCreationDate,
				maybeExpirationDate,
				isCorrupt: false,
				isValid: false,
			}
		}

		return {
			isCorrupt: false,
			isValid: true,
			id: maybeId.value,
			name: P.name(maybeProduct.value),
			creationDate: P.creationDate(maybeProduct.value),
			maybeExpirationDate: P.maybeExpirationDate(maybeProduct.value),
		}
	})
}
