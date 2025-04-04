import {
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

export class Tag extends C.Tag(
	'GetSortedProductsUseCase',
)<
	Tag,
	Eff.Effect<
		{
			models: ProductModel[];
			total: NNInt.NonNegativeInteger;
		},
		void
	>
>() {}

export type ProductModel =
	| {
			isValid: true;
			id: string;
			name: NonEmptyTrimmedString;
			expirationDate: O.Option<Int.Integer>;
			creationDate: Int.Integer;
	  }
	| {
			isValid: false;
			id: O.Option<string>;
			name: O.Option<NonEmptyTrimmedString>;
	  };

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

			const models: ProductModel[] =
				yield* Eff.all(
					rawProducts.map(rawProduct =>
						Eff.gen(function* () {
							if (!rawProduct.isValid) {
								yield* H.logError(
									'Invalid raw product supplied',
								).pipe(
									Eff.annotateLogs({
										p: rawProduct,
									}),
								);
								return rawProduct;
							}

							const product =
								P.createProduct(rawProduct);

							return {
								name: P.name(product),
								expirationDate:
									P.expirationDate(product),
								id: rawProduct.id,
								creationDate:
									rawProduct.creationDate,
								isValid: true,
							} as const;
						}),
					),
				);

			return { models, total };
		});
	}),
);
