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
import type { OptionOrValue } from '$lib/core/utils.ts';

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
	maybeExpirationDate: OptionOrValue<Int.Integer>;
}

export const useCase = L.effect(
	Tag,
	Eff.gen(function* () {
		const addProduct = yield* AddProduct.Tag;

		return productData =>
			Eff.gen(function* () {
				const timestamp = Int.unsafe_fromNumber(
					yield* Cl.currentTimeMillis,
				);

				const product = P.createProduct({
					...productData,
					maybeCreationDate: timestamp,
				});

				if (O.isNone(product)) {
					return yield* Eff.fail(
						'Product is not valid',
					);
				}

				yield* H.logInfo(
					'Product save attempt',
				).pipe(
					Eff.annotateLogs(
						'product',
						productData,
					),
				);

				yield* addProduct({
					maybeName: P.name(product.value),
					maybeExpirationDate:
						P.maybeExpirationDate(product.value),
					maybeCreationDate: P.creationDate(
						product.value,
					),
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
