import { A, E, Eff, Int, NETS, O, Sc, pipe } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

import { GetSortedProducts as GetSortedProductsOperation } from '$lib/business/app/operations'
import * as P from '$lib/business/domain/product'

export const Product = Sc.Union(
	Sc.Struct({
		isCorrupt: Sc.Literal(false),
		id: Sc.String,
		maybeName: Sc.Option(NETS.NonEmptyTrimmedStringSchema),
		maybeExpirationDate: Sc.Option(Int.IntegerSchema),
		maybeCreationDate: Sc.Option(Int.IntegerSchema),
		isValid: Sc.Literal(false),
	}),
	Sc.Struct({
		isCorrupt: Sc.Literal(false),
		id: Sc.String,
		name: NETS.NonEmptyTrimmedStringSchema,
		maybeExpirationDate: Sc.Option(Int.IntegerSchema),
		creationDate: Int.IntegerSchema,
		isValid: Sc.Literal(true),
	}),
	Sc.Struct({
		isCorrupt: Sc.Literal(true),
		maybeName: Sc.Option(NETS.NonEmptyTrimmedStringSchema),
	}),
)

export type Product = Sc.Schema.Type<typeof Product>

export const GetSortedProductsDTO = Sc.Array(Product)

export type GetSortedProductsDTO = Sc.Schema.Type<typeof GetSortedProductsDTO>

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

				const entries = yield* pipe(
					result,
					A.map(toProductResultWithEffect),
					Eff.all,
				)

				return entries
			}).pipe(withLayerLogging(`A`)) satisfies Eff.Effect<Product[], void>
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

			return yield* P.fromStruct({
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
			name: maybeProduct.value.name,
			creationDate: maybeProduct.value.creationDate,
			maybeExpirationDate: maybeProduct.value.maybeExpirationDate,
		}
	})
}
