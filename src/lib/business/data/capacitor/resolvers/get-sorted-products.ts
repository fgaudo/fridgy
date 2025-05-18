import { ParseResult } from 'effect'

import { E, Eff, H, Int, L, NETS, O, Sc, pipe } from '$lib/core/imports.ts'

import { GetSortedProducts } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'

const DtoFromBackend = Sc.transformOrFail(
	Sc.Struct({
		total: Sc.Number,
		products: Sc.Array(
			Sc.Struct({
				id: Sc.OptionFromUndefinedOr(Sc.Number).annotations({
					decodingFallback: H.fallback(O.none()),
				}),
				name: Sc.OptionFromUndefinedOr(Sc.String).annotations({
					decodingFallback: H.fallback(O.none()),
				}),
				expirationDate: Sc.OptionFromUndefinedOr(Sc.Number).annotations({
					decodingFallback: H.fallback(O.none()),
				}),
				creationDate: Sc.OptionFromUndefinedOr(Sc.Number).annotations({
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
	}),
	GetSortedProducts.GetSortedProductsDTO,
	{
		strict: true,
		decode: response =>
			Eff.all(
				response.products.map(product =>
					Eff.gen(function* () {
						return {
							maybeId: yield* O.match(product.id, {
								onNone: () => Eff.succeed(O.none<string>()),
								onSome: id => Eff.option(Eff.try(() => JSON.stringify(id))),
							}),

							maybeName: pipe(product.name, O.flatMap(NETS.fromString)),

							maybeExpirationDate: pipe(
								product.expirationDate,
								O.flatMap(Int.fromNumber),
							),

							maybeCreationDate: pipe(
								product.creationDate,
								O.flatMap(Int.fromNumber),
							),
						}
					}),
				),
			),
		encode: (actual, _, ast) =>
			ParseResult.fail(
				new ParseResult.Forbidden(
					ast,
					actual,
					`This transformer is only for decoding`,
				),
			),
	},
)

export const query = L.effect(
	GetSortedProducts.Tag,
	Eff.gen(function* () {
		const { getAllProductsWithTotal } = yield* DbPlugin
		return Eff.gen(function* () {
			const result = yield* pipe(getAllProductsWithTotal, Eff.either)

			if (E.isLeft(result)) {
				yield* Eff.logError(result.left.error)
				return yield* new GetSortedProducts.FetchingFailed()
			}
			const entries = yield* Sc.decodeUnknown(DtoFromBackend)(
				result.right,
			).pipe(Eff.catchTags({ ParseError: Eff.die }))

			return entries
		})
	}),
)
