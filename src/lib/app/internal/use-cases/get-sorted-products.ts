import {
	A,
	C,
	E,
	Eff,
	H,
	Int,
	L,
	NNInt,
	O,
} from '$lib/core/imports.ts';
import type { NonEmptyTrimmedString } from '$lib/core/non-empty-trimmed-string.ts';

import * as P from '$lib/domain/product.ts';

import { GetSortedProducts } from '$lib/app/queries.ts';

export type Product =
	| {
			id: string;
			name: NonEmptyTrimmedString;
			maybeExpirationDate?: O.Option<Int.Integer>;
			creationDate: Int.Integer;
			isValid: true;
	  }
	| {
			id: string;
			maybeName?: O.Option<NonEmptyTrimmedString>;
			maybeExpirationDate?: O.Option<Int.Integer>;
			maybeCreationDate?: O.Option<Int.Integer>;
			isValid: false;
	  };

export type CorruptProduct = {
	maybeName?: O.Option<NonEmptyTrimmedString>;
};

export class Tag extends C.Tag(
	'GetSortedProductsUseCase',
)<
	Tag,
	Eff.Effect<
		{
			products: {
				entries: Product[];
				corrupts: CorruptProduct[];
			};
			total: NNInt.NonNegativeInteger;
		},
		void
	>
>() {}

export const useCase = L.effect(
	Tag,
	Eff.gen(function* () {
		const getProductListWithTotal =
			yield* GetSortedProducts.Tag;

		return Eff.gen(function* () {
			const result = yield* Eff.either(
				getProductListWithTotal,
			);

			if (E.isLeft(result)) {
				yield* H.logError(result);
				return yield* Eff.fail(undefined);
			}

			const { total, products: rawProducts } =
				result.right;

			yield* H.logInfo(
				`Received ${rawProducts.length.toString(10)} products out of ${total.toString(10)}`,
			).pipe(
				Eff.annotateLogs('products', rawProducts),
			);

			const [corrupts, entries] = A.partitionMap(
				rawProducts,
				rawProduct =>
					E.gen(function* () {
						const maybeId =
							rawProduct.maybeId ?? O.none();

						if (O.isNone(maybeId)) {
							return yield* E.left(rawProduct);
						}

						const product =
							P.createProduct(rawProduct);

						if (O.isNone(product)) {
							return {
								maybeCreationDate:
									rawProduct.maybeCreationDate,
								maybeExpirationDate:
									rawProduct.maybeExpirationDate,
								maybeName: rawProduct.maybeName,
								id: maybeId.value,
								isValid: false,
							} satisfies Product;
						}

						return {
							isValid: true,
							id: maybeId.value,
							name: P.name(product.value),
							creationDate: P.creationDate(
								product.value,
							),
							maybeExpirationDate:
								P.maybeExpirationDate(
									product.value,
								),
						} satisfies Product;
					}),
			);

			return {
				products: {
					entries,
					corrupts,
				},
				total,
			};
		});
	}),
);
