import {
	Eff,
	H,
	L,
	O,
} from '$lib/core/imports.ts';
import { asOption } from '$lib/core/utils.ts';

import { AddProduct } from '$lib/business/app/queries.ts';

import { DbPlugin } from '../db-plugin.ts';

export const command = L.effect(
	AddProduct.Tag,
	Eff.gen(function* () {
		const { db } = yield* DbPlugin;

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
							new AddProduct.OperationFailed({
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
