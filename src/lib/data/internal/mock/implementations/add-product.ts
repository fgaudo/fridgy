import { Eff, L } from '$lib/core/imports.ts';

import { AddProduct } from '$lib/app/queries.ts';

import { withErrors } from '../constants.ts';
import { map } from '../db.ts';

let i = 0;

export const command = L.succeed(
	AddProduct.Tag,
	product =>
		Eff.gen(function* () {
			if (withErrors && Math.random() < 0.5) {
				return yield* Eff.fail(undefined);
			}

			const index = (i++).toString(10);
			map.set(index, {
				...product,
				id: index,
			});
		}),
);
