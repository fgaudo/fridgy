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
				const maybeExpirationDate =
					product.maybeExpirationDate ?? O.none();
				yield* H.tryPromise(() =>
					db.addProduct({
						product: {
							name: product.name,
							creationDate: product.creationDate,
							expirationDate: O.getOrUndefined(
								maybeExpirationDate,
							),
						},
					}),
				);

				yield* H.logDebug(
					'No errors adding the product',
				);
			});
	}),
);
