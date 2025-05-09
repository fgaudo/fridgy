import { LogLevel } from 'effect'

import {
	A,
	E,
	Eff,
	Int,
	NNInt,
	O,
	pipe,
} from '$lib/core/imports.ts'
import type { NonEmptyTrimmedString } from '$lib/core/non-empty-trimmed-string.ts'

import {
	GetSortedProducts as GetSortedProductsOperation,
	LogWithLevel,
} from '$lib/business/app/operations'
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
			id: symbol
			isCorrupt: true
			maybeName: O.Option<NonEmptyTrimmedString>
	  }

export type ProductsPage = {
	entries: Product[]
	total: NNInt.NonNegativeInteger
}

export class GetSortedProducts extends Eff.Service<GetSortedProducts>()(
	'app/useCases/GetSortedProducts',
	{
		effect: Eff.gen(function* () {
			const getSortedProducts = Eff.request(
				GetSortedProductsOperation.Request({}),
				yield* GetSortedProductsOperation.Resolver,
			)

			const logResolver =
				yield* LogWithLevel.Resolver

			return pipe(
				Eff.gen(function* () {
					const errorOrData = yield* pipe(
						getSortedProducts,
						Eff.either,
					)

					if (
						E.isLeft(errorOrData) &&
						errorOrData.left._tag ===
							'FetchingFailed'
					) {
						yield* Eff.request(
							LogWithLevel.Request({
								level: LogLevel.Error,
								message: [
									`Could not receive items.`,
								],
							}),
							logResolver,
						)

						return yield* Eff.fail(undefined)
					}

					if (E.isLeft(errorOrData)) {
						yield* Eff.request(
							LogWithLevel.Request({
								level: LogLevel.Error,
								message: [
									`Received invalid data.`,
								],
							}),
							logResolver,
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
								yield* Eff.request(
									LogWithLevel.Request({
										level: LogLevel.Warning,
										message: [
											`Received ${result.products.length.toString(10)} items, but they exceed the reported total (${result.total.toString(10)}).`,
										],
									}),
									logResolver,
								)

								return NNInt.unsafeMake(
									result.products.length,
								)
							}

							yield* Eff.request(
								LogWithLevel.Request({
									level: LogLevel.Info,
									message: [
										`Received ${result.products.length.toString(10)} items out of ${result.total.toString(10)}`,
									],
								}),
								logResolver,
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
					LogWithLevel.Resolver,
					logResolver,
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
}: GetSortedProductsOperation.ProductDTO): Eff.Effect<
	Product,
	never,
	LogWithLevel.Resolver
> {
	return Eff.gen(function* () {
		const logResolver =
			yield* LogWithLevel.Resolver

		if (O.isNone(maybeId)) {
			yield* Eff.request(
				LogWithLevel.Request({
					level: LogLevel.Warning,
					message: [
						`CORRUPTION - Product has no id.`,
					],
					annotations: {
						name: maybeName,
					},
				}),
				logResolver,
			)

			return {
				id: Symbol(),
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
			yield* Eff.request(
				LogWithLevel.Request({
					level: LogLevel.Warning,
					message: [`Product is invalid.`],
					annotations: {
						id: maybeId.value,
						name: maybeName,
					},
				}),
				logResolver,
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
