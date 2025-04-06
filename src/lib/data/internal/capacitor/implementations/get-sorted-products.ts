import { pipe } from 'effect';

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
} from '$lib/core/imports.ts';

import { GetSortedProducts } from '$lib/app/queries.ts';

import { Capacitor } from '$lib/data/index.ts';

const ProductsListSchema = Sc.Struct({
	total: Sc.Number,
	products: Sc.Array(
		Sc.Struct({
			id: Sc.OptionFromUndefinedOr(
				Sc.Number,
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
});

export const query = L.effect(
	GetSortedProducts.Tag,
	Eff.gen(function* () {
		const { db } = yield* Capacitor.Tag;

		return Eff.gen(function* () {
			const result = yield* pipe(
				H.tryPromise(() =>
					db.getAllProductsWithTotal(),
				),
				Eff.either,
			);

			if (E.isLeft(result)) {
				yield* H.logError(result.left.toString());
				return yield* Eff.fail([
					result.left.toString(),
				]);
			}

			const decodeResult =
				yield* Sc.decodeUnknown(
					ProductsListSchema,
				)(result.right).pipe(Eff.either);

			if (E.isLeft(decodeResult)) {
				yield* H.logError(
					decodeResult.left.toString(),
				);

				return yield* Eff.fail(undefined);
			}

			const totalResult = NNInt.fromNumber(
				decodeResult.right.total,
			);

			if (O.isNone(totalResult)) {
				return yield* Eff.fail(undefined);
			}

			const total = totalResult.value;

			const products =
				decodeResult.right.products.map(
					product =>
						({
							maybeId: pipe(
								product.id,
								O.map(id => id.toString(10)),
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
						}) satisfies GetSortedProducts.ProductDTO,
				);

			return {
				total,
				products,
			};
		});
	}),
);
