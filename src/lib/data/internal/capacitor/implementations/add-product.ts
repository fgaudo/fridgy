import {
	Eff,
	H,
	L,
	O,
} from '$lib/core/imports.ts';

import { AddProduct } from '$lib/app/queries.ts';

import { Capacitor } from '$lib/data/index.ts';

export const command = L.effect(
	AddProduct.Tag,
	Eff.gen(function* () {
		const { db } = yield* Capacitor.Tag;

		return product =>
			Eff.gen(function* () {
				yield* H.tryPromise(() =>
					db.addProduct({
						product: {
							name: product.name,
							creationDate: product.creationDate,
							expirationDate: O.isSome(
								product.expirationDate,
							)
								? product.expirationDate.value
								: undefined,
						},
					}),
				);

				yield* H.logDebug(
					'No errors adding the product',
				);
			});
	}),
);
