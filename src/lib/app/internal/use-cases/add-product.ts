import {
	C,
	Cl,
	Eff,
	H,
	Int,
	L,
	NETS,
	O,
} from '$lib/core/imports.ts';

import * as P from '$lib/domain/product.ts';

import { AddProduct } from '$lib/app/queries.ts';

export class Tag extends C.Tag(
	'AddProductUseCase',
)<
	Tag,
	(product: ProductDTO) => Eff.Effect<void, void>
>() {}

export interface ProductDTO {
	name: NETS.NonEmptyTrimmedString;
	expirationDate: O.Option<Int.Integer>;
}

export const useCase = L.effect(
	Tag,
	Eff.gen(function* () {
		const addProduct = yield* AddProduct.Tag;

		return productData =>
			Eff.gen(function* () {
				const product =
					P.createProduct(productData);

				const timestamp = Int.unsafe_fromNumber(
					yield* Cl.currentTimeMillis,
				);

				yield* H.logInfo(
					'Product save attempt',
				).pipe(
					Eff.annotateLogs(
						'product',
						productData,
					),
				);

				yield* addProduct({
					name: P.name(product),
					expirationDate:
						P.expirationDate(product),
					creationDate: timestamp,
				});

				yield* H.logInfo('Product saved').pipe(
					Eff.annotateLogs(
						'product',
						productData,
					),
				);
			});
	}),
);
