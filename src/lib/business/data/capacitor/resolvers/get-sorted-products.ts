import { RequestResolver, pipe } from 'effect'

import {
	E,
	Eff,
	H,
	Int,
	L,
	NETS,
	NNInt,
	O,
	Sc,
} from '$lib/core/imports.ts'

import { GetSortedProducts } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'

const ProductsListSchema = Sc.Struct({
	total: Sc.Number,
	products: Sc.Array(
		Sc.Struct({
			id: Sc.OptionFromUndefinedOr(
				Sc.Unknown,
			).annotations({
				decodingFallback: H.fallback(O.none()),
			}),
			name: Sc.OptionFromUndefinedOr(
				Sc.String,
			).annotations({
				decodingFallback: H.fallback(O.none()),
			}),
			expirationDate: Sc.OptionFromUndefinedOr(
				Sc.Number,
			).annotations({
				decodingFallback: H.fallback(O.none()),
			}),
			creationDate: Sc.OptionFromUndefinedOr(
				Sc.Number,
			).annotations({
				decodingFallback: H.fallback(O.none()),
			}),
		}).annotations({
			decodingFallback: H.fallback({
				id: O.none(),
				name: O.none(),
				expirationDate: O.none(),
				creationDate: O.none(),
			}),
		}),
	),
})

export const query = L.effect(
	GetSortedProducts.Resolver,
	Eff.gen(function* () {
		const { db } = yield* DbPlugin

		return RequestResolver.fromEffect(() =>
			Eff.gen(function* () {
				const result = yield* pipe(
					H.tryPromise(() =>
						db.getAllProductsWithTotal(),
					),
					Eff.either,
				)

				if (E.isLeft(result)) {
					return yield* new GetSortedProducts.FetchingFailed()
				}

				const decodeResult =
					yield* Sc.decodeUnknown(
						ProductsListSchema,
					)(result.right).pipe(Eff.either)

				if (E.isLeft(decodeResult)) {
					return yield* new GetSortedProducts.InvalidDataReceived()
				}
				console.log(decodeResult)
				const totalResult = NNInt.fromNumber(
					decodeResult.right.total,
				)

				if (O.isNone(totalResult)) {
					return yield* new GetSortedProducts.InvalidDataReceived()
				}

				const total = totalResult.value

				const products = yield* Eff.all(
					decodeResult.right.products.map(
						product =>
							Eff.gen(function* () {
								return {
									maybeId: yield* O.match(
										product.id,
										{
											onNone: () =>
												Eff.succeed(
													O.none<string>(),
												),
											onSome: id =>
												Eff.option(
													Eff.try(() =>
														JSON.stringify(id),
													),
												),
										},
									),

									maybeName: pipe(
										product.name,
										O.flatMap(NETS.fromString),
									),

									maybeExpirationDate: pipe(
										product.expirationDate,
										O.flatMap(Int.fromNumber),
									),

									maybeCreationDate: pipe(
										product.creationDate,
										O.flatMap(Int.fromNumber),
									),
								} satisfies GetSortedProducts.ProductDTO
							}),
					),
				)

				return {
					total,
					products,
				}
			}),
		)
	}),
)
