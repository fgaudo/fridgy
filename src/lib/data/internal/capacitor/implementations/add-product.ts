import {
	Eff,
	H,
	L,
	O,
} from '$lib/core/imports.ts';
import { asOption } from '$lib/core/utils.ts';

import { AddProduct } from '$lib/app/queries.ts';

import { Capacitor } from '$lib/data/index.ts';

export const command = L.effect(
	AddProduct.Tag,
	Eff.gen(function* () {
		const { db } = yield* Capacitor.Tag;

		return product =>
			Eff.gen(function* () {
				const maybeExpirationDate = asOption(
					product.maybeExpirationDate,
				);
				yield* H.tryPromise(() =>
					db.addProduct({
						product: {
							name: O.getOrElse(
								asOption(product.maybeName),
								() => '[no name]',
							),
							creationDate: O.getOrElse(
								asOption(
									product.maybeCreationDate,
								),
								() => 0,
							),
							expirationDate: O.getOrUndefined(
								maybeExpirationDate,
							),
						},
					}),
				).pipe(
					Eff.catchTags({
						UnknownException: ({ message }) =>
							new AddProduct.Infrastructure({
								message,
							}),
					}),
				);

				yield* Eff.logDebug(
					'No errors adding the product',
				);
			});
	}),
);
