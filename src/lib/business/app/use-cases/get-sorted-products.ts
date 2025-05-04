import { Duration, LogLevel } from 'effect'

import {
	A,
	E,
	Eff,
	Int,
	NNInt,
	O,
	pipe,
} from '$lib/core/imports.ts'
import { unsafe_fromNumber } from '$lib/core/integer/non-negative.ts'
import type { NonEmptyTrimmedString } from '$lib/core/non-empty-trimmed-string.ts'

import {
	GetSortedProducts as GetSortedProductsQuery,
	LogWithLevel,
} from '$lib/business/app/queries'
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
	'app/GetSortedProducts',
	{
		effect: Eff.gen(function* () {
			const getProductListWithTotal =
				yield* GetSortedProductsQuery.GetSortedProducts

			const log = yield* LogWithLevel.LogWithLevel

			return pipe(
				Eff.gen(function* () {
					const [duration, errorOrData] =
						yield* pipe(
							getProductListWithTotal,
							Eff.either,
							Eff.timed,
						)

					yield* log(
						LogLevel.Info,
						`Fetching took ${Duration.format(duration)}`,
					)

					if (
						E.isLeft(errorOrData) &&
						errorOrData.left._tag ===
							'FetchingFailed'
					) {
						yield* log(
							LogLevel.Error,
							`Could not receive items.`,
						)

						return yield* Eff.fail(undefined)
					}

					if (E.isLeft(errorOrData)) {
						yield* log(
							LogLevel.Error,
							`Received invalid data.`,
						)

						return yield* Eff.fail(undefined)
					}

					const result = errorOrData.right

					const total = yield* Eff.gen(
						function* () {
							if (
								result.total <
								result.products.length
							) {
								yield* log(
									LogLevel.Warning,
									`Received ${result.products.length.toString(10)} items, but they exceed the reported total (${result.total.toString(10)}).`,
								)

								return unsafe_fromNumber(
									result.products.length,
								)
							}

							yield* log(
								LogLevel.Info,
								`Received ${result.products.length.toString(10)} items out of ${result.total.toString(10)}`,
							)

							return result.total
						},
					)

					const entries = yield* pipe(
						result.products,
						A.map(toProductResultWithEffect),
						Eff.all,
					)

					return {
						entries,
						total,
					}
				}),
				Eff.provideService(
					LogWithLevel.LogWithLevel,
					log,
				),
			) satisfies Eff.Effect<ProductsPage, void>
		}),
	},
) {}

function toProductResultWithEffect({
	maybeId,
	maybeName,
	maybeCreationDate,
	maybeExpirationDate,
}: GetSortedProductsQuery.ProductDTO): Eff.Effect<
	Product,
	never,
	LogWithLevel.LogWithLevel
> {
	return Eff.gen(function* () {
		const log = yield* LogWithLevel.LogWithLevel

		if (O.isNone(maybeId)) {
			yield* pipe(
				log(
					LogLevel.Warning,
					`CORRUPTION - Product has no id. `,
				),
				Eff.annotateLogs('name', maybeName),
			)
			return {
				isCorrupt: true,
				maybeName,
			}
		}

		const maybeProduct = O.gen(function* () {
			const { name, creationDate } = yield* O.all(
				{
					name: maybeName,
					creationDate: maybeCreationDate,
				},
			)

			return yield* P.createProduct({
				name,
				creationDate,
				maybeExpirationDate,
			})
		})

		if (O.isNone(maybeProduct)) {
			yield* pipe(
				log(
					LogLevel.Warning,
					`Product is invalid. `,
				),
				Eff.annotateLogs({
					id: maybeId.value,
					name: maybeName,
				}),
			)

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
			creationDate: P.creationDate(
				maybeProduct.value,
			),
			maybeExpirationDate: P.maybeExpirationDate(
				maybeProduct.value,
			),
		}
	})
}
