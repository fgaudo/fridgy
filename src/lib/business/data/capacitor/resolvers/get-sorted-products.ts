import { E, Eff, H, Int, L, NETS, O, Sc, pipe } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

import { GetSortedProducts } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'

const Backend = Sc.Struct({
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
})

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

			const decodeResult = yield* Sc.decodeUnknown(Backend)(result.right).pipe(
				Eff.either,
			)

			if (E.isLeft(decodeResult)) {
				return yield* new GetSortedProducts.InvalidDataReceived()
			}

			const entries = yield* Eff.all(
				decodeResult.right.products.map(product =>
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
						} as const
					}),
				),
			)

			return entries
		}).pipe(withLayerLogging(`I`))
	}),
)
