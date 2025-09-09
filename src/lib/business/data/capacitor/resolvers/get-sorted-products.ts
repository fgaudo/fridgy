import { E, Eff, H, Int, L, NETS, O, Sc, pipe } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

import { GetSortedProducts } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'

export const Backend = Sc.Struct({
	total: Sc.Number,
	products: Sc.Array(
		Sc.Struct({
			id: Sc.UndefinedOr(Sc.Int).annotations({
				decodingFallback: H.fallback(undefined),
			}),
			name: Sc.UndefinedOr(Sc.String).annotations({
				decodingFallback: H.fallback(undefined),
			}),
			expirationDate: Sc.UndefinedOr(Sc.JsonNumber).annotations({
				decodingFallback: H.fallback(undefined),
			}),
			creationDate: Sc.UndefinedOr(Sc.JsonNumber).annotations({
				decodingFallback: H.fallback(undefined),
			}),
			storage: Sc.UndefinedOr(
				Sc.Union(Sc.Literal('freezer'), Sc.Literal('fridge')),
			).annotations({
				decodingFallback: H.fallback(undefined),
			}),
		}).annotations({
			decodingFallback: H.fallback({
				id: undefined,
				name: undefined,
				expirationDate: undefined,
				creationDate: undefined,
				storage: undefined,
			}),
		}),
	),
})

export const query = L.effect(
	GetSortedProducts.Tag,
	Eff.gen(function* () {
		const { getAllProductsWithTotal } = yield* DbPlugin
		return Eff.gen(function* () {
			const result = yield* Eff.either(getAllProductsWithTotal)

			if (E.isLeft(result)) {
				yield* Eff.logError(result.left)
				return yield* new GetSortedProducts.FetchingFailed()
			}

			const decodeResult = yield* Eff.either(
				Sc.decodeUnknown(Backend)(result.right),
			)

			if (E.isLeft(decodeResult)) {
				return yield* new GetSortedProducts.InvalidDataReceived()
			}

			const entries = yield* Eff.all(
				decodeResult.right.products.map(product =>
					Eff.gen(function* () {
						return {
							maybeId: yield* O.match(O.fromNullable(product.id), {
								onNone: () => Eff.succeed(O.none<string>()),
								onSome: id => Eff.option(Eff.try(() => JSON.stringify(id))),
							}),

							maybeName: O.fromNullable(product.name).pipe(
								O.flatMap(NETS.fromString),
							),

							maybeExpirationDate: pipe(
								O.fromNullable(product.expirationDate),
								O.flatMap(Int.fromNumber),
							),

							maybeCreationDate: pipe(
								O.fromNullable(product.creationDate),
								O.flatMap(Int.fromNumber),
							),

							maybeStorage: O.fromNullable(product.storage),
						} as const
					}),
				),
			)

			return entries
		}).pipe(withLayerLogging(`I`))
	}),
)
